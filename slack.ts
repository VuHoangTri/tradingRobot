import fetch from "node-fetch";

export async function sendChatToBot(text: string) {
    const body =
    {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }
        ]
    };
    await fetch("https://hooks.slack.com/services/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",
        {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        })
}

export async function sendNoti(text: string) {
    const errBot = 'https://hooks.slack.com/services/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';
    const body =
    {
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }
        ]
    };
    await fetch(errBot,
        {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        })
}
