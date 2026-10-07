using Innova.OnboardComputer.App;

var builder = Host.CreateApplicationBuilder(args);
var settings = builder.Services.AddOnboardComputer(builder.Configuration);

var host = builder.Build();
if (!settings.Simulation.Enabled)
{
    host.Services.GetRequiredService<ILogger<Program>>().LogWarning(
        "Simulation is off and no real device adapters are registered yet: nothing will be sent.");
}

host.Run();
