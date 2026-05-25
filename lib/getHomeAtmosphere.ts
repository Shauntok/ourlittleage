export function getHomeAtmosphere() {
  const hour = new Date().getHours();

  // ===== 深夜 =====
  if (hour >= 0 && hour < 5) {
    return {
      label: "🌙 深夜模式",
      glow: "bg-violet-500/10",
      heroTitle: "世界已经睡了。",
      heroText:
        "但这里还有一些人，静静留下今天。",
      quote:
        "深夜适合诚实。",
    };
  }

  // ===== 清晨 =====
  if (hour >= 5 && hour < 11) {
    return {
      label: "🌤 清晨模式",
      glow: "bg-sky-400/10",
      heroTitle: "新的一天开始了。",
      heroText:
        "有人刚醒来，有人还没睡。",
      quote:
        "今天也会慢慢发生。",
    };
  }

  // ===== 午后 =====
  if (hour >= 11 && hour < 18) {
    return {
      label: "☀️ 午后模式",
      glow: "bg-orange-400/10",
      heroTitle: "生活正在流动。",
      heroText:
        "有人正在忙碌，有人正在发呆。",
      quote:
        "别忘了喘口气。",
    };
  }

  // ===== 夜晚 =====
  return {
    label: "🌆 夜晚模式",
    glow: "bg-pink-500/10",
    heroTitle: "夜晚慢慢降临。",
    heroText:
      "今天快结束了，但故事还没。",
    quote:
      "有些话只适合晚上说。",
  };
}