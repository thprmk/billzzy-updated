// /lib/overrideConsole.js

import { logger } from "../logger";

// Ensure we're on the server (Next.js runs both on client and server)
if (typeof window === 'undefined') {
  // Override console.log
  console.log = (...args) => {
    logger.info(args.join(' '));
  };

  console.info = (...args) => {
    logger.info(args.join(' '));
  };

  console.warn = (...args) => {
    logger.warn(args.join(' '));
  };

  console.error = (...args) => {
    logger.error(args.join(' '));
  };
}
