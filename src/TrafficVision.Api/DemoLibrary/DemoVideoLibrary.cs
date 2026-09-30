using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TrafficVision.Api.Models;

namespace TrafficVision.Api.DemoLibrary;

public sealed class DemoLibraryOptions
{
    public const string SectionName = "DemoLibrary";

    public string VideosPath { get; set; } = "../../data/demo/videos";

    public string ResultsPath { get; set; } = "../../data/demo/results";
}

public sealed record DemoVideoSummary(
    string Id,
    string Video,
    string CameraView,
    double DurationSeconds,
    int AnalyzedFrames,
    double ProcessingFps,
    DateTimeOffset AnalyzedAtUtc,
    PassengerVideoSummary Summary);

/// <summary>
/// Pre-analyzed demo clips: videos live in one folder and each has a
/// "&lt;video file name&gt;.result.json" in the results folder.
/// </summary>
public sealed class DemoVideoLibrary(IOptions<DemoLibraryOptions> options, IHostEnvironment environment)
{
    public const string ResultSuffix = ".result.json";

    public static readonly HashSet<string> VideoExtensions =
        new(StringComparer.OrdinalIgnoreCase) { ".mp4", ".mov", ".avi", ".mkv" };

    public static readonly JsonSerializerOptions JsonOptions = CreateJsonOptions();

    public string VideosPath { get; } = Path.GetFullPath(options.Value.VideosPath, environment.ContentRootPath);

    public string ResultsPath { get; } = Path.GetFullPath(options.Value.ResultsPath, environment.ContentRootPath);

    public static string ResultFileName(string videoFileName) => videoFileName + ResultSuffix;

    public IReadOnlyList<DemoVideoSummary> List()
    {
        if (!Directory.Exists(ResultsPath))
        {
            return [];
        }

        var items = new List<DemoVideoSummary>();
        foreach (var resultPath in Directory.EnumerateFiles(ResultsPath, "*" + ResultSuffix))
        {
            var id = Path.GetFileName(resultPath)[..^ResultSuffix.Length];
            if (FindVideo(id) is null)
            {
                continue;
            }

            PassengerVideoResult? result;
            try
            {
                using var stream = File.OpenRead(resultPath);
                result = JsonSerializer.Deserialize<PassengerVideoResult>(stream, JsonOptions);
            }
            catch (JsonException)
            {
                continue;
            }

            if (result is null)
            {
                continue;
            }

            items.Add(new DemoVideoSummary(
                id,
                result.Video,
                result.CameraView,
                result.DurationSeconds,
                result.Frames.Count,
                result.ProcessingFps,
                result.AnalyzedAtUtc,
                result.Summary));
        }

        return items.OrderBy(item => item.Id, StringComparer.OrdinalIgnoreCase).ToArray();
    }

    public string? FindVideo(string id) =>
        VideoExtensions.Contains(Path.GetExtension(id)) ? ResolveInside(VideosPath, id) : null;

    public string? FindResult(string id) =>
        FindVideo(id) is null ? null : ResolveInside(ResultsPath, ResultFileName(id));

    private static string? ResolveInside(string directory, string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) ||
            fileName != Path.GetFileName(fileName) ||
            fileName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0)
        {
            return null;
        }

        var path = Path.Combine(directory, fileName);
        return File.Exists(path) ? path : null;
    }

    private static JsonSerializerOptions CreateJsonOptions()
    {
        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        jsonOptions.Converters.Add(new JsonStringEnumConverter());
        return jsonOptions;
    }
}
