namespace Innova.OnboardComputer.App.Sources;

/// <summary>
/// Readings a device pushed and the next message has not taken yet. Bounded, so a source that
/// keeps producing while nothing drains cannot exhaust memory; the oldest readings go first.
/// </summary>
public sealed class ReadingBuffer<T>(int capacity)
{
    private readonly Queue<T> _items = new();
    private readonly Lock _lock = new();

    public void Add(T item)
    {
        lock (_lock)
        {
            if (_items.Count == capacity)
            {
                _items.Dequeue();
            }

            _items.Enqueue(item);
        }
    }

    public IReadOnlyList<T> Drain()
    {
        lock (_lock)
        {
            var items = _items.ToArray();
            _items.Clear();
            return items;
        }
    }
}
