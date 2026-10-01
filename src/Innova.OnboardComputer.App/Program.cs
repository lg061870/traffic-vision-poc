using Innova.OnboardComputer.App.Configuration;

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddOptions<OnboardComputerOptions>()
    .Bind(builder.Configuration.GetSection(OnboardComputerOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();
builder.Services.AddSingleton(TimeProvider.System);

builder.Build().Run();
