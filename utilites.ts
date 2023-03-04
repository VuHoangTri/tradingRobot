
export function formatDateString(dateTime: Date) {
    const date = dateTime.getDate();
    const month = dateTime.getMonth() + 1;
    const year = dateTime.getFullYear();
    const hours = dateTime.getHours();
    const minutes = dateTime.getMinutes();
    return `${date}/${month}/${year} ${hours}:${minutes}`
}