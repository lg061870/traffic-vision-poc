using Innova.OnboardComputer.App.Sending;

namespace Innova.OnboardComputer.App.Tests;

public sealed class MessageOutboxTests
{
    [Fact]
    public async Task Messages_wait_while_the_api_is_unreachable()
    {
        var outbox = TestSupport.Outbox();
        var api = new ScriptedApiClient(SendOutcome.RetryLater, SendOutcome.RetryLater);

        outbox.Enqueue(TestSupport.Message(1));
        var afterFirst = await outbox.FlushAsync(api, CancellationToken.None);
        outbox.Enqueue(TestSupport.Message(2));
        var afterSecond = await outbox.FlushAsync(api, CancellationToken.None);

        Assert.Equal(1, afterFirst);
        Assert.Equal(2, afterSecond);
        // Only the oldest is tried while the API is down; newer ones must not overtake it.
        Assert.Equal([1L, 1L], api.Calls.Select(call => call.Message.Sequence));
    }

    [Fact]
    public async Task Buffered_messages_are_resent_oldest_first_when_the_api_returns()
    {
        var outbox = TestSupport.Outbox();
        var api = new ScriptedApiClient(SendOutcome.RetryLater, SendOutcome.RetryLater, SendOutcome.RetryLater);

        for (var sequence = 1; sequence <= 3; sequence++)
        {
            outbox.Enqueue(TestSupport.Message(sequence));
            await outbox.FlushAsync(api, CancellationToken.None);
        }

        outbox.Enqueue(TestSupport.Message(4));
        var left = await outbox.FlushAsync(api, CancellationToken.None);

        Assert.Equal(0, left);
        Assert.Equal([1L, 2L, 3L, 4L], api.Delivered);
    }

    [Fact]
    public async Task Api_going_down_mid_flush_keeps_the_rest_in_order()
    {
        var outbox = TestSupport.Outbox();
        for (var sequence = 1; sequence <= 4; sequence++)
        {
            outbox.Enqueue(TestSupport.Message(sequence));
        }

        var api = new ScriptedApiClient(SendOutcome.Accepted, SendOutcome.RetryLater);
        var left = await outbox.FlushAsync(api, CancellationToken.None);
        await outbox.FlushAsync(api, CancellationToken.None);

        Assert.Equal(3, left);
        Assert.Equal([1L, 2L, 3L, 4L], api.Delivered);
    }

    [Fact]
    public async Task A_message_the_api_rejects_is_dropped_so_it_cannot_block_the_rest()
    {
        var outbox = TestSupport.Outbox();
        outbox.Enqueue(TestSupport.Message(1));
        outbox.Enqueue(TestSupport.Message(2));
        var api = new ScriptedApiClient(SendOutcome.Rejected);

        var left = await outbox.FlushAsync(api, CancellationToken.None);

        Assert.Equal(0, left);
        Assert.Equal([2L], api.Delivered);
    }

    [Fact]
    public async Task A_full_buffer_drops_the_oldest_messages()
    {
        var outbox = TestSupport.Outbox(maxBuffered: 3);
        for (var sequence = 1; sequence <= 5; sequence++)
        {
            outbox.Enqueue(TestSupport.Message(sequence));
        }

        var api = new ScriptedApiClient();
        await outbox.FlushAsync(api, CancellationToken.None);

        Assert.Equal([3L, 4L, 5L], api.Delivered);
    }
}
