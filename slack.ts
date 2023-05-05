import fetch from "node-fetch";

export async function sendChatToBot(icon: string, text: string, botChat: string) {
    // console.log(text);
    let imageUrl = '';
    if (icon === 'bull') {
        imageUrl = 'https://pbs.twimg.com/profile_images/1511962457392050181/Kf0qPySN_400x400.jpg';
    }
    else {
        imageUrl = 'https://logopond.com/logos/9b4155eff794a19dd788f56b42844e78.png';
    }
    // const urlBot = 'https://hooks.slack.com/services/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';
    const bot = ['https://hooks.slack.com/services/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',
        'https://hooks.slack.com/services/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',
        'https://hooks.slack.com/services/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'];
    const body =
    {
        "blocks": [
            {
                "type": "section",
                "accessory": {
                    "type": "image",
                    "image_url": imageUrl,
                    "alt_text": icon
                },
                "text": {
                    "type": "mrkdwn",
                    "text": text
                }
            }
        ]
    };
    await fetch(botChat,
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
