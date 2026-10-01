using Innova.OnboardComputer.App.Contracts;
using Innova.OnboardComputer.App.Sending;
using Innova.OnboardComputer.App.Sources;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;

namespace Innova.OnboardComputer.App.Tests;

public sealed class TelemetryWorkerTests : IAsyncLifetime
{
    private readonly WatchedTimeProvider _time = new(new DateTimeOffset(2026, 10, 1, 14, 0, 0, TimeSpan.Zero));
    private readonly BufferedGpsSource _gps = new();
    private readonly BufferedDoorCounterSource _doors = new();
    private readonly ScriptedApiClient _api = new();
    private readonly TelemetryWorker _worker;

    public TelemetryWorkerTests()
    {
        var builder = new MessageBuilder(_gps, _doors, new BufferedVisionSource("m", "cabin-front"), new SequenceGenerator(1), _time);
        _worker = new TelemetryWorker(builder, TestSupport.Outbox(), _api, _doors, TestSupport.Options(), _time, NullLogger<TelemetryWorker>.Instance);
    }

    public async Task InitializeAsync()
    {
        await _worker.StartAsync(CancellationToken.None);
        // ExecuteAsync runs in the background; once its first wait starts, it is listening.
        await _time.WaitForTimersAsync(1);
    }

    public Task DisposeAsync() => _worker.StopAsync(CancellationToken.None);

    [Fact]
    public async Task Sends_every_interval()
    {
        _gps.Add("$GPGGA,1*00");
        _time.Advance(TimeSpan.FromSeconds(9));
        await Task.Delay(100);
        Assert.Empty(_api.Calls);

        _time.Advance(TimeSpan.FromSeconds(1));
        await WaitForCallsAsync(1);
        await _time.WaitForTimersAsync(2);
        _gps.Add("$GPGGA,2*00");
        _time.Advance(TimeSpan.FromSeconds(10));
        await WaitForCallsAsync(2);

        Assert.Equal([1L, 2L], _api.Calls.Select(call => call.Message.Sequence));
    }

    [Fact]
    public async Task Sends_immediately_when_a_door_closes()
    {
        _time.Advance(TimeSpan.FromSeconds(3));
        _doors.Add(new RawDoorCounterEvent(1, RawFormats.DoorOpened, _time.GetUtcNow().AddSeconds(-20)));
        _doors.Add(new RawDoorCounterEvent(1, RawFormats.DoorCount, _time.GetUtcNow().AddSeconds(-5), 2, 0));
        await Task.Delay(100);
        Assert.Empty(_api.Calls);

        _doors.Add(new RawDoorCounterEvent(1, RawFormats.DoorClosed, _time.GetUtcNow()));
        await WaitForCallsAsync(1);

        Assert.Equal(
            [RawFormats.DoorOpened, RawFormats.DoorCount, RawFormats.DoorClosed],
            _api.Calls[0].Message.DoorCounter!.Events.Select(item => item.Type));
    }

    private async Task WaitForCallsAsync(int count)
    {
        for (var attempt = 0; attempt < 500 && _api.Calls.Count < count; attempt++)
        {
            await Task.Delay(10);
        }

        Assert.Equal(count, _api.Calls.Count);
    }

    /// <summary>A fake clock that also tells the test when the worker has started waiting on it.</summary>
    private sealed class WatchedTimeProvider(DateTimeOffset start) : TimeProvider
    {
        private readonly FakeTimeProvider _fake = new(start);
        private int _timers;

        public void Advance(TimeSpan delta) => _fake.Advance(delta);

        public override DateTimeOffset GetUtcNow() => _fake.GetUtcNow();

        public override ITimer CreateTimer(TimerCallback callback, object? state, TimeSpan dueTime, TimeSpan period)
        {
            var timer = _fake.CreateTimer(callback, state, dueTime, period);
            Interlocked.Increment(ref _timers);
            return timer;
        }

        public async Task WaitForTimersAsync(int count)
        {
            for (var attempt = 0; attempt < 500 && Volatile.Read(ref _timers) < count; attempt++)
            {
                await Task.Delay(10);
            }

            Assert.True(Volatile.Read(ref _timers) >= count, "the worker never started waiting");
        }
    }
}
