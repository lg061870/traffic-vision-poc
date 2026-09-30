using TrafficVision.Api.Configuration;
using TrafficVision.Api.DemoLibrary;
using TrafficVision.Api.Services;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

const string frontendCorsPolicy = "FrontendDevelopment";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

builder.Services.AddControllers().AddJsonOptions(options =>
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();
builder.Services.Configure<PassengerVisionOptions>(
    builder.Configuration.GetSection(PassengerVisionOptions.SectionName));
builder.Services.Configure<DemoLibraryOptions>(
    builder.Configuration.GetSection(DemoLibraryOptions.SectionName));
builder.Services.AddSingleton<PassengerImageAnalyzer>();
builder.Services.AddSingleton<PassengerVideoProcessor>();
builder.Services.AddSingleton<DemoVideoLibrary>();
builder.Services.AddSingleton<BatchAnalysisRunner>();
builder.Services.AddSingleton<PassengerVideoAnalysisCoordinator>();
builder.Services.AddHostedService(provider =>
    provider.GetRequiredService<PassengerVideoAnalysisCoordinator>());
builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

if (args.Length > 0 && args[0] == "batch")
{
    BatchArguments batchArguments;
    try
    {
        batchArguments = BatchArguments.Parse(args[1..]);
    }
    catch (Exception exception) when (exception is ArgumentException or FormatException)
    {
        Console.Error.WriteLine(exception.Message);
        Console.Error.WriteLine(BatchArguments.Usage);
        return 1;
    }

    using var stop = new CancellationTokenSource();
    Console.CancelKeyPress += (_, eventArgs) =>
    {
        eventArgs.Cancel = true;
        stop.Cancel();
        Console.WriteLine("Stopping after the current frame... (the finished clips are already saved)");
    };

    try
    {
        return await app.Services.GetRequiredService<BatchAnalysisRunner>().RunAsync(batchArguments, stop.Token);
    }
    catch (OperationCanceledException)
    {
        return 130;
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(frontendCorsPolicy);
app.UseAuthorization();

app.MapControllers();

app.Run();
return 0;
