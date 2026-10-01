using System.Globalization;

namespace Innova.OnboardComputer.App.Sources;

/// <summary>
/// Writes NMEA 0183 sentences the way a GPS receiver does, checksum included. The simulator uses
/// it; a real receiver already outputs these lines and needs no writer.
/// </summary>
public static class NmeaWriter
{
    private const double KnotsPerKilometer = 1 / 1.852;

    /// <summary>$GPRMC: time, date, position, speed and course.</summary>
    public static string Rmc(DateTimeOffset time, double lat, double lon, double speedKmh, double courseDegrees)
    {
        var utc = time.ToUniversalTime();
        return Sentence(string.Join(',',
            "GPRMC",
            utc.ToString("HHmmss.ff", CultureInfo.InvariantCulture),
            "A",
            Latitude(lat),
            lat >= 0 ? "N" : "S",
            Longitude(lon),
            lon >= 0 ? "E" : "W",
            Number(speedKmh * KnotsPerKilometer, "0.0"),
            Number(courseDegrees, "0.0"),
            utc.ToString("ddMMyy", CultureInfo.InvariantCulture),
            "",
            "",
            "A"));
    }

    /// <summary>$GPGGA: time, position and fix quality (1 = GPS fix).</summary>
    public static string Gga(DateTimeOffset time, double lat, double lon, int satellites = 9, double hdop = 0.9, double altitudeMeters = 1350)
    {
        var utc = time.ToUniversalTime();
        return Sentence(string.Join(',',
            "GPGGA",
            utc.ToString("HHmmss.ff", CultureInfo.InvariantCulture),
            Latitude(lat),
            lat >= 0 ? "N" : "S",
            Longitude(lon),
            lon >= 0 ? "E" : "W",
            "1",
            satellites.ToString("00", CultureInfo.InvariantCulture),
            Number(hdop, "0.0"),
            Number(altitudeMeters, "0.0"),
            "M",
            "",
            "M",
            "",
            ""));
    }

    /// <summary>Wraps a sentence body in $…*hh, where hh is the XOR of every character of the body.</summary>
    public static string Sentence(string body) => $"${body}*{Checksum(body):X2}";

    public static int Checksum(string body)
    {
        var checksum = 0;
        foreach (var character in body)
        {
            checksum ^= character;
        }

        return checksum;
    }

    // NMEA writes degrees and minutes together: ddmm.mmmm and dddmm.mmmm.
    private static string Latitude(double degrees) => DegreesMinutes(degrees, "00");

    private static string Longitude(double degrees) => DegreesMinutes(degrees, "000");

    private static string DegreesMinutes(double degrees, string degreeFormat)
    {
        // Round the total first so 59.99999 minutes becomes the next degree, never "60.0000".
        var totalMinutes = Math.Round(Math.Abs(degrees) * 60, 4);
        var whole = Math.Floor(totalMinutes / 60);
        var minutes = totalMinutes - (whole * 60);
        return whole.ToString(degreeFormat, CultureInfo.InvariantCulture) +
               minutes.ToString("00.0000", CultureInfo.InvariantCulture);
    }

    private static string Number(double value, string format) => value.ToString(format, CultureInfo.InvariantCulture);
}
