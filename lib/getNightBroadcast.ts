export function getNightBroadcast(
  onlineCount?: number
) {

  const quietBroadcasts = [

    "🌙 今晚似乎变得很安静。",

    "☁️ 有些房间已经熄灯了。",

    "🫧 世界正在慢慢沉下去。",

    "📖 还有人留在故事里。",

    "🌧️ 雨声好像还没停。",

    "🎧 有人正在听着歌发呆。",

    "☕ 深夜总让人想很多事情。",

    "🌫️ 有些情绪只适合留在夜里。",

    "💭 今晚似乎很多人睡不着。",

    "🕯️ 还有房间亮着微弱的灯。",

  ];

  const activeBroadcasts = [

    "🌙 今晚很多居民还醒着。",

    "📖 有人在深夜读完了一篇故事。",

    "☕ 有人正在自己的房间发呆。",

    "🫧 有人刚刚回到了房间。",

    "🌧️ 今晚似乎很多灯还亮着。",

    "🎧 有人在听歌直到凌晨。",

    "🕯️ 深夜广场今晚很热闹。",

    "💬 有些故事正在被慢慢留下。",

  ];

  // ===== 根据在线人数切换氛围 =====

  const pool =
    onlineCount && onlineCount >= 5
      ? activeBroadcasts
      : quietBroadcasts;

  return pool[
    Math.floor(
      Math.random() * pool.length
    )
  ];
}