export const formatUtcToLocalDateTime = (utcValue) => {
  if (!utcValue) {
    return "-";
  }

  const parsedDate = new Date(utcValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
};
