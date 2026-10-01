using System.Globalization;
using Innova.Occupancy.Api.Ingestion;
using Innova.OnboardComputer.App.Sources;

namespace Innova.OnboardComputer.App.Tests;

public sealed class NmeaWriterTests
{
    private static readonly DateTimeOffset Time = new(2026, 10, 1, 0, 15, 10, TimeSpan.Zero);

    // Guadalupe: 9°56.7918' N, 84°03.2106' W.
    private const double Lat = 9 + (56.7918 / 60);
    private const double Lon = -(84 + (3.2106 / 60));

    [Fact]
    public void Writes_the_same_sentences_as_a_receiver()
    {
        // The sample sentences in src/Innova.Occupancy.Api/Innova.Occupancy.Api.http.
        Assert.Equal(
            "$GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A*70",
            NmeaWriter.Rmc(Time, Lat, Lon, 0, 87.5));
        Assert.Equal(
            "$GPGGA,001510.00,0956.7918,N,08403.2106,W,1,09,0.9,1191.0,M,,M,,*5A",
            NmeaWriter.Gga(Time, Lat, Lon, altitudeMeters: 1191));
    }

    [Theory]
    [InlineData(9.976073, -84.007282, 22.4, 45.0)]
    [InlineData(-33.8688, 151.2093, 0, 359.9)]
    [InlineData(0.0000001, -0.0000001, 120, 0)]
    [InlineData(9.999999999, -84.999999999, 5, 180)]
    public void Checksum_is_the_xor_of_the_body(double lat, double lon, double speed, double course)
    {
        foreach (var sentence in new[] { NmeaWriter.Rmc(Time, lat, lon, speed, course), NmeaWriter.Gga(Time, lat, lon) })
        {
            var star = sentence.LastIndexOf('*');
            var body = sentence[1..star];
            var expected = body.Aggregate(0, (checksum, character) => checksum ^ character);

            Assert.StartsWith("$", sentence);
            Assert.Equal(star + 3, sentence.Length);
            Assert.Equal(expected, int.Parse(sentence[(star + 1)..], NumberStyles.HexNumber, CultureInfo.InvariantCulture));
            Assert.Matches("^[0-9A-F]{2}$", sentence[(star + 1)..]);
        }
    }

    [Theory]
    [InlineData(9.976073, -84.007282, 22.4)]
    [InlineData(-33.8688, 151.2093, 0)]
    [InlineData(9.999999999, -84.999999999, 5)]
    public void The_api_parser_accepts_both_sentences_with_the_same_position(double lat, double lon, double speed)
    {
        Assert.True(NmeaParser.TryParse(NmeaWriter.Rmc(Time, lat, lon, speed, 90), Time, out var rmc));
        Assert.True(NmeaParser.TryParse(NmeaWriter.Gga(Time, lat, lon), Time, out var gga));

        foreach (var fix in new[] { rmc, gga })
        {
            Assert.Equal(Time, fix.Time);
            Assert.Equal(lat, fix.Lat, 5);
            Assert.Equal(lon, fix.Lon, 5);
        }

        Assert.Equal(speed, rmc.SpeedKmh!.Value, 0);
    }

    [Fact]
    public void A_corrupted_sentence_fails_its_checksum()
    {
        var sentence = NmeaWriter.Rmc(Time, Lat, Lon, 10, 90);
        var corrupted = sentence.Replace("0956.7918", "0956.7919");

        Assert.False(NmeaParser.TryParse(corrupted, Time, out _));
    }
}
