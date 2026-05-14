'use strict';

/**
 * Messaging channel contract.
 *
 * Every channel (Telegram, WhatsApp, SMS, …) passes these fields to the
 * shared processor and must implement the send() method.
 *
 * IncomingMessage shape:
 * {
 *   senderId   : string   — channel-specific ID (Telegram user ID, phone number, …)
 *   senderName : string   — display name to record in sheets ("Jeff", "Sarah")
 *   text       : string   — the message text (already transcribed if voice)
 *   channel    : string   — "telegram" | "whatsapp"
 *   messageId  : string   — used for deduplication
 * }
 *
 * Channels call processMessage() from src/core/processor.js with:
 * {
 *   messageText : string
 *   senderName  : string
 *   replyFn     : async (text: string) => void
 * }
 */

class BaseMessenger {
  /**
   * Send a text message to a recipient.
   * @param {string} recipientId — channel-specific identifier
   * @param {string} text
   */
  async send(recipientId, text) { // eslint-disable-line no-unused-vars
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Resolve a sender ID to a human display name.
   * Return null if the sender is not authorized.
   * @param {string} senderId
   * @returns {string|null}
   */
  getDisplayName(senderId) { // eslint-disable-line no-unused-vars
    throw new Error('getDisplayName() must be implemented by subclass');
  }
}

module.exports = { BaseMessenger };
