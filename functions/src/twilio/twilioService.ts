import twilio = require('twilio');
const accountSid: string = process.env.TWILIO_ACCOUNT_SID || '';
const token: string = process.env.TWILIO_AUTH_TOKEN || '';
const client = twilio(accountSid, token);
const twilioNumber = process.env.TWILIO_PHONE;

export const sendTextMessage = async (data: { body: string, to: string }) => {
    const response = await client.messages.create({ ...data, from: twilioNumber });
    console.log(response);
}

export const sendBulkTextMessage = (data: string, numbers: Array<string>) => {
    Promise.all(
        numbers.map(number => {
            return client.messages.create({
                to: number,
                from: process.env.TWILIO_MESSAGING_SERVICE_SID,
                body: data
            });
        })
    )
        .then(messages => {
            console.log('Messages sent!');
        })
        .catch(err => console.error(err));
}