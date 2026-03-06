export async function runFallbackChain(sources, execute, finalMessage) {
  const errors = [];

  for (const source of sources) {
    try {
      const value = await execute(source);
      return { value, sourceName: source.name };
    } catch (error) {
      errors.push({ sourceName: source.name, error });
    }
  }

  const finalError = new Error(finalMessage);
  finalError.details = errors.map((item) => ({
    sourceName: item.sourceName,
    message: item.error?.message || String(item.error)
  }));
  throw finalError;
}
