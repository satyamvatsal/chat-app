import React from "react";
import clsx from "clsx";

const formatTime = (ts) => {
  const date = new Date(ts);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

export default function MessageBubble({
  message,
  isSender,
  color = "bg-blue-500",
  sender = "",
  timestamp,
}) {
  return (
    <div
      className={clsx("flex mb-2", isSender ? "justify-end" : "justify-start")}
    >
      <div className="flex flex-col max-w-[80%]">
        {sender && !isSender && (
          <span className="text-xs text-gray-500 ml-1 mb-1">{sender}</span>
        )}
        <div
          className={clsx(
            "px-4 py-2 rounded-xl text-white break-words",
            color,
            isSender ? "rounded-br-none" : "rounded-bl-none",
          )}
        >
          <span>{message}</span>
          {timestamp && (
            <p className="text-[10px] text-gray-200 text-right mt-1">
              {formatTime(timestamp)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
