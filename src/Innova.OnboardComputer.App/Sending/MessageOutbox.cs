using Innova.OnboardComputer.App.Configuration;
using Innova.OnboardComputer.App.Contracts;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Innova.OnboardComputer.App.Sending;

/// <summary>
/// Messages waiting to reach the API, oldest first. They must go in order: the API ignores a
/// sequence at or below the last one it accepted, so sending a newer message first would make
/// every older one a duplicate and lose its door counts.
/// </summary>
public sealed class MessageOutbox(IOptions<OnboardComputerOptions> options, ILogger<MessageOutbox> logger)
{
    private readonly LinkedList<RawVehicleMessage> _pending = new();
    private readonly SemaphoreSlim _flushing = new(1, 1);
    private readonly Lock _lock = new();

    public int Count
    {
        get
        {
            lock (_lock)
            {
                return _pending.Count;
            }
        }
    }

    public void Enqueue(RawVehicleMessage message)
    {
        lock (_lock)
        {
            if (_pending.Count >= options.Value.MaxBufferedMessages)
            {
                logger.LogWarning(
                    "Buffer full ({Count} messages): dropping the oldest, sequence {Sequence}.",
                    _pending.Count,
                    _pending.First!.Value.Sequence);
                _pending.RemoveFirst();
            }

            _pending.AddLast(message);
        }
    }

    /// <summary>
    /// Sends buffered messages oldest first until the buffer is empty or the API stops
    /// answering. Returns how many messages are still waiting.
    /// </summary>
    public async Task<int> FlushAsync(IOccupancyApiClient client, CancellationToken cancellationToken)
    {
        await _flushing.WaitAsync(cancellationToken);
        try
        {
            while (Peek() is { } message)
            {
                var result = await client.SendAsync(message, cancellationToken);
                switch (result.Outcome)
                {
                    case SendOutcome.RetryLater:
                        logger.LogWarning(
                            "Occupancy API unreachable ({Detail}); {Count} messages buffered.",
                            result.Detail,
                            Count);
                        return Count;
                    case SendOutcome.Rejected:
                        logger.LogError("Occupancy API rejected sequence {Sequence}: {Detail}", message.Sequence, result.Detail);
                        break;
                    default:
                        logger.LogDebug("Sent sequence {Sequence}.", message.Sequence);
                        break;
                }

                Remove(message);
            }

            return 0;
        }
        finally
        {
            _flushing.Release();
        }
    }

    private RawVehicleMessage? Peek()
    {
        lock (_lock)
        {
            return _pending.First?.Value;
        }
    }

    private void Remove(RawVehicleMessage message)
    {
        lock (_lock)
        {
            // Enqueue may have dropped it already while the buffer was full.
            if (_pending.First?.Value == message)
            {
                _pending.RemoveFirst();
            }
        }
    }
}
