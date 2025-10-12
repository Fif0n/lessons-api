
exports.getHumanTimestamp = time => {
    const pad = n => n.toString().padStart(2, '0');
    const year = time.getFullYear();
    const month = pad(time.getMonth() + 1);
    const day = pad(time.getDate());
    const hours = pad(time.getHours());
    const minutes = pad(time.getMinutes());

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

exports.getHumanDate = time => {
    const pad = n => n.toString().padStart(2, '0');
    const year = time.getFullYear();
    const month = pad(time.getMonth() + 1);
    const day = pad(time.getDate());

    return `${year}-${month}-${day}`;
}