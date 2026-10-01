using Innova.OnboardComputer.App.Contracts;

namespace Innova.OnboardComputer.App.Sources;

// In-memory sources that anything can push readings into: the scenario player today, a serial
// port reader or a vision API client later. The capacities stay under the API's per-message
// limits (2000 sentences, 1000 door events, 1000 frames).

public sealed class BufferedGpsSource : IGpsSource
{
    private readonly ReadingBuffer<string> _sentences = new(2000);

    public void Add(string sentence) => _sentences.Add(sentence);

    public IReadOnlyList<string> DrainSentences() => _sentences.Drain();
}

public sealed class BufferedDoorCounterSource(string format = RawFormats.ApcDoorEventsV1) : IDoorCounterSource
{
    private readonly ReadingBuffer<RawDoorCounterEvent> _events = new(1000);

    public string Format => format;

    public event EventHandler<RawDoorCounterEvent>? DoorClosed;

    public void Add(RawDoorCounterEvent item)
    {
        _events.Add(item);
        if (item.Type == RawFormats.DoorClosed)
        {
            DoorClosed?.Invoke(this, item);
        }
    }

    public IReadOnlyList<RawDoorCounterEvent> DrainEvents() => _events.Drain();
}

public sealed class BufferedVisionSource(string model, string camera) : IVisionSource
{
    private readonly ReadingBuffer<RawVisionFrame> _frames = new(1000);

    public string Model => model;

    public string Camera => camera;

    public void Add(RawVisionFrame frame) => _frames.Add(frame);

    public IReadOnlyList<RawVisionFrame> DrainFrames() => _frames.Drain();
}
