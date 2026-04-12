function stamp() {
  return new Date().toISOString();
}

export const logger = {
  info(message, meta) {
    if (meta) {
      console.log(`[monitoring] ${stamp()} INFO ${message}`, meta);
      return;
    }

    console.log(`[monitoring] ${stamp()} INFO ${message}`);
  },

  warn(message, meta) {
    if (meta) {
      console.warn(`[monitoring] ${stamp()} WARN ${message}`, meta);
      return;
    }

    console.warn(`[monitoring] ${stamp()} WARN ${message}`);
  },

  error(message, meta) {
    if (meta) {
      console.error(`[monitoring] ${stamp()} ERROR ${message}`, meta);
      return;
    }

    console.error(`[monitoring] ${stamp()} ERROR ${message}`);
  },

  critical(message, meta) {
    if (meta) {
      console.error(`[monitoring] ${stamp()} CRITICAL ${message}`, meta);
      return;
    }

    console.error(`[monitoring] ${stamp()} CRITICAL ${message}`);
  },
};
