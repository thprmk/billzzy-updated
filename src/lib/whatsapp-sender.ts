//lib/whatsapp-sender
import axios from 'axios';

// Define the structure of the WhatsApp API configuration
interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
}

/**
 * Sends a WhatsApp template message using the Meta Graph API.
 * @param config - The API credentials (accessToken, phoneNumberId).
 * @param customerPhone - The recipient's phone number in international format.
 * @param templateName - The name of the pre-approved message template.
 * @param templateParams - An array of strings to fill the template variables (e.g., {{1}}, {{2}}).
 */
export async function sendWhatsAppMessage(
  config: WhatsAppConfig,
  customerPhone: string,
  templateName: string,
  templateParams: string[]
) {
  console.log(`Sending template '${templateName}' to ${customerPhone}`);
  
  const apiUrl = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;

  // Construct the payload required by the WhatsApp API
  const payload = {
    messaging_product: "whatsapp",
    to: customerPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en_US", // Or your desired language
      },
      components: [
        {
          type: "body",
          // Map the array of params to the format WhatsApp expects
          parameters: templateParams.map(param => ({ type: "text", text: param })),
        },
      ],
    },
  };

  try {
    await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    console.log('✅ Digital receipt sent successfully.');
    return { success: true };
  } catch (error: any) {
    const errorDetails = error.response ? error.response.data : error.message;
    console.error('❌ Failed to send WhatsApp message:', JSON.stringify(errorDetails, null, 2));
    return { success: false, error: errorDetails };
  }
}