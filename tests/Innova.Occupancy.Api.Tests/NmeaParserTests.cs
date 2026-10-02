using Innova.Occupancy.Api.Ingestion;

namespace Innova.Occupancy.Api.Tests;

public sealed class NmeaParserTests
{
    private static readonly DateTimeOffset MessageTime = new(2026, 10, 1, 0, 15, 12, TimeSpan.Zero);

    [Fact]
    public void Reads_rmc_position_time_and_speed()
    {
        Assert.True(NmeaParser.TryParse(
            "$GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A*70", MessageTime, out var fix));

        Assert.Equal(new DateTimeOffset(2026, 10, 1, 0, 15, 10, TimeSpan.Zero), fix.Time);
        Assert.Equal(9.946530, fix.Lat, 5);
        Assert.Equal(-84.053510, fix.Lon, 5);
        Assert.Equal(0, fix.SpeedKmh);
    }

    [Fact]
    public void Reads_gga_using_the_message_date()
    {
        Assert.True(NmeaParser.TryParse(
            "$GPGGA,001510.00,0956.7918,N,08403.2106,W,1,09,0.9,1191.0,M,,M,,*5A", MessageTime, out var fix));

        Assert.Equal(new DateTimeOffset(2026, 10, 1, 0, 15, 10, TimeSpan.Zero), fix.Time);
        Assert.Null(fix.SpeedKmh);
    }

    [Fact]
    public void Converts_knots_and_handles_other_talkers_and_hemispheres()
    {
        var sentence = Sentence("GNRMC,120000.00,A,3352.1200,S,15112.6000,E,10.0,0.0,011026,,,A");

        Assert.True(NmeaParser.TryParse(sentence, MessageTime, out var fix));
        Assert.Equal(-33.868667, fix.Lat, 5);
        Assert.Equal(151.21, fix.Lon, 5);
        Assert.Equal(18.5, fix.SpeedKmh);
    }

    [Fact]
    public void Reads_the_rmc_course_as_heading_only_while_moving()
    {
        Assert.True(NmeaParser.TryParse(Sentence("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,12.0,231.4,011026,,,A"), MessageTime, out var moving));
        Assert.True(NmeaParser.TryParse(Sentence("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.3,87.5,011026,,,A"), MessageTime, out var stopped));
        Assert.True(NmeaParser.TryParse(Sentence("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,12.0,,011026,,,A"), MessageTime, out var noCourse));
        Assert.True(NmeaParser.TryParse(
            "$GPGGA,001510.00,0956.7918,N,08403.2106,W,1,09,0.9,1191.0,M,,M,,*5A", MessageTime, out var gga));

        Assert.Equal(231.4, moving.HeadingDeg);
        Assert.Null(stopped.HeadingDeg);
        Assert.Null(noCourse.HeadingDeg);
        Assert.Null(gga.HeadingDeg);
    }

    [Fact]
    public void Rmc_wins_over_gga_at_the_same_instant()
    {
        var (fixes, _) = NmeaParser.Parse(
        [
            Sentence("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,12.0,231.4,011026,,,A"),
            "$GPGGA,001510.00,0956.7918,N,08403.2106,W,1,09,0.9,1191.0,M,,M,,*5A"
        ], MessageTime);

        Assert.Equal(22.2, fixes[^1].SpeedKmh);
        Assert.Equal(231.4, fixes[^1].HeadingDeg);
    }

    [Theory]
    [InlineData("$GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A*71")] // wrong checksum
    [InlineData("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A*70")] // no $
    [InlineData("$GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A")] // no checksum
    public void Rejects_malformed_sentences(string sentence)
    {
        Assert.False(NmeaParser.TryParse(sentence, MessageTime, out _));
    }

    [Fact]
    public void Rejects_sentences_without_a_fix_or_of_other_types()
    {
        Assert.False(NmeaParser.TryParse(Sentence("GPRMC,001510.00,V,,,,,,,011026,,,N"), MessageTime, out _));
        Assert.False(NmeaParser.TryParse(Sentence("GPGGA,001510.00,0956.7918,N,08403.2106,W,0,00,,,M,,M,,"), MessageTime, out _));
        Assert.False(NmeaParser.TryParse(Sentence("GPGSV,1,1,00"), MessageTime, out _));
    }

    [Fact]
    public void Parse_counts_rejected_sentences_and_orders_fixes()
    {
        var (fixes, rejected) = NmeaParser.Parse(
        [
            Sentence("GPRMC,001511.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A"),
            Sentence("GPRMC,001510.00,A,0956.7918,N,08403.2106,W,0.0,87.5,011026,,,A"),
            "$garbage*00"
        ], MessageTime);

        Assert.Equal(1, rejected);
        Assert.Equal(2, fixes.Count);
        Assert.True(fixes[0].Time < fixes[1].Time);
    }

    internal static string Sentence(string body) =>
        $"${body}*{body.Aggregate(0, (checksum, character) => checksum ^ character):X2}";
}
