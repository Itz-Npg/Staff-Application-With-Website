import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSessionUser } from '../../../lib/auth';
import { connectToDatabase, ApplicationConfig } from '../../../lib/mongodb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSessionUser(req, res);
    if (!session?.user?.accessToken) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    await connectToDatabase();
    const guildId = req.query.id as string;
    const { channelId: targetChannelId, updateConfig: shouldUpdateConfig } = req.body || {};

    const botToken = process.env.DISCORD_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    let config = await ApplicationConfig.findOne({ guildId });

    if (!config && targetChannelId) {
      config = new ApplicationConfig({
        guildId,
        channelId: targetChannelId,
        logsChannelId: targetChannelId,
        categoryId: null,
        enabled: true,
        questions: [
          "What is your age?",
          "What timezone are you in?",
          "Why do you want to become a staff member?",
          "Do you have any previous moderation experience?",
          "How active can you be per week?"
        ],
        cooldown: 86400000,
      });
      await config.save();
    } else if (!config) {
      return res.status(404).json({ error: "Application system not configured. Please select a channel to send the panel or configure the system in the Config tab." });
    }

    const sendToChannel = targetChannelId || config.channelId;

    if (!sendToChannel) {
      return res.status(400).json({ error: "No channel specified. Please select a channel to send the panel." });
    }

    if (shouldUpdateConfig && targetChannelId && targetChannelId !== config.channelId) {
      await ApplicationConfig.findOneAndUpdate(
        { guildId },
        { $set: { channelId: targetChannelId } }
      );
    }

    const panelContent = {
      components: [
        {
          type: 17,
          accent_color: 5793266,
          components: [
            {
              type: 10,
              content: "## Staff Application"
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 10,
              content: "Want to become a staff member? Click the button below to apply!\n\n**Requirements:**\n- Be respectful and follow all server rules\n- Be active in the community\n- Have a clear microphone (if applicable)\n\n**Note:** You can only apply once every 24 hours."
            },
            {
              type: 14,
              divider: true
            },
            {
              type: 10,
              content: "-# Staff Application System"
            },
            {
              type: 14,
              divider: false
            },
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 1,
                  label: "Apply Now",
                  custom_id: "app_apply_button"
                }
              ]
            }
          ]
        }
      ],
      flags: 32768
    };

    const response = await fetch(`https://discord.com/api/v10/channels/${sendToChannel}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bot ${botToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(panelContent)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Discord API error:", response.status, errorData);
      
      if (response.status === 403) {
        return res.status(403).json({ error: "Bot doesn't have permission to send messages in the selected channel" });
      }
      if (response.status === 404) {
        return res.status(404).json({ error: "Channel not found. The channel may have been deleted." });
      }
      
      return res.status(500).json({ error: "Failed to send panel to Discord" });
    }

    const messageData = await response.json();

    res.json({ 
      success: true, 
      message: "Application panel sent successfully",
      messageId: messageData.id,
      channelId: sendToChannel
    });
  } catch (error) {
    console.error('Error sending panel:', error);
    res.status(500).json({ error: 'Failed to send panel' });
  }
}
