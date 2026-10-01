using System.Text.Json;

namespace Innova.OnboardComputer.App.Simulation;

public sealed record RoutePoint(double Lat, double Lon, double BearingDegrees);

/// <summary>A route line from data/routes/coronado-routes-osm.geojson, measured in kilometers.</summary>
public sealed class RoutePath
{
    private const double EarthRadiusKm = 6371.0088;

    private readonly (double Lat, double Lon)[] _points;
    private readonly double[] _km;

    public RoutePath(string routeId, IReadOnlyList<(double Lat, double Lon)> points)
    {
        if (points.Count < 2)
        {
            throw new ArgumentException($"Route {routeId} needs at least two points.", nameof(points));
        }

        RouteId = routeId;
        _points = points.ToArray();
        _km = new double[_points.Length];
        for (var i = 1; i < _points.Length; i++)
        {
            _km[i] = _km[i - 1] + Distance(_points[i - 1], _points[i]);
        }
    }

    public string RouteId { get; }

    public double LengthKm => _km[^1];

    /// <summary>The point <paramref name="km"/> along the route and the direction it runs there.</summary>
    public RoutePoint At(double km)
    {
        km = Math.Clamp(km, 0, LengthKm);
        var segment = Array.BinarySearch(_km, km);
        segment = segment >= 0 ? Math.Min(segment, _km.Length - 2) : Math.Max(0, ~segment - 1);

        var (from, to) = (_points[segment], _points[segment + 1]);
        var length = _km[segment + 1] - _km[segment];
        var fraction = length <= 0 ? 0 : (km - _km[segment]) / length;
        return new RoutePoint(
            from.Lat + ((to.Lat - from.Lat) * fraction),
            from.Lon + ((to.Lon - from.Lon) * fraction),
            Bearing(from, to));
    }

    /// <summary>Reads one LineString feature, matched by its routeId property, from a GeoJSON file.</summary>
    public static RoutePath Load(string geoJsonFile, string routeId)
    {
        using var document = JsonDocument.Parse(File.ReadAllText(geoJsonFile));
        foreach (var feature in document.RootElement.GetProperty("features").EnumerateArray())
        {
            if (feature.GetProperty("properties").TryGetProperty("routeId", out var id) &&
                id.GetString() == routeId)
            {
                // GeoJSON positions are [lon, lat].
                var points = feature.GetProperty("geometry").GetProperty("coordinates").EnumerateArray()
                    .Select(position => (position[1].GetDouble(), position[0].GetDouble()))
                    .ToArray();
                return new RoutePath(routeId, points);
            }
        }

        throw new InvalidOperationException($"Route {routeId} is not in {geoJsonFile}.");
    }

    private static double Distance((double Lat, double Lon) a, (double Lat, double Lon) b)
    {
        var dLat = Radians(b.Lat - a.Lat);
        var dLon = Radians(b.Lon - a.Lon);
        var h = (Math.Sin(dLat / 2) * Math.Sin(dLat / 2)) +
                (Math.Cos(Radians(a.Lat)) * Math.Cos(Radians(b.Lat)) * Math.Sin(dLon / 2) * Math.Sin(dLon / 2));
        return 2 * EarthRadiusKm * Math.Asin(Math.Sqrt(h));
    }

    private static double Bearing((double Lat, double Lon) a, (double Lat, double Lon) b)
    {
        var dLon = Radians(b.Lon - a.Lon);
        var y = Math.Sin(dLon) * Math.Cos(Radians(b.Lat));
        var x = (Math.Cos(Radians(a.Lat)) * Math.Sin(Radians(b.Lat))) -
                (Math.Sin(Radians(a.Lat)) * Math.Cos(Radians(b.Lat)) * Math.Cos(dLon));
        return (Math.Atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    private static double Radians(double degrees) => degrees * Math.PI / 180;
}
