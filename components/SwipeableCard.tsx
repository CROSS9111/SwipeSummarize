"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { ReactNode } from "react";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  disabled = false,
}: SwipeableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateZ = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(
    x,
    [-200, -150, 0, 150, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 100;

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.offset.y) > swipeThreshold) {
      if (info.offset.x > swipeThreshold && onSwipeRight) {
        // 右スワイプ - とっとく
        onSwipeRight();
      } else if (info.offset.x < -swipeThreshold && onSwipeLeft) {
        // 左スワイプ - すてる
        onSwipeLeft();
      } else if (info.offset.y < -swipeThreshold && onSwipeUp) {
        // 上スワイプ - もう一度
        onSwipeUp();
      }
    } else {
      // スワイプが不十分な場合は元の位置に戻す
      x.set(0);
      y.set(0);
    }
  };

  return (
    <motion.div
      drag={!disabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      style={{
        x,
        y,
        rotateZ,
        opacity,
        cursor: disabled ? "default" : "grab",
      }}
      animate={{ x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      whileDrag={{ cursor: "grabbing" }}
      className="relative"
    >
      {children}

      {/* スワイプ方向のインジケーター */}
      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          opacity: useTransform(x, [0, 100], [0, 1]),
        }}
      >
        <div className="bg-green-500/20 rounded-lg px-6 py-3 border-2 border-green-500">
          <span className="text-green-600 font-bold text-xl">とっとく</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          opacity: useTransform(x, [0, -100], [0, 1]),
        }}
      >
        <div className="bg-red-500/20 rounded-lg px-6 py-3 border-2 border-red-500">
          <span className="text-red-600 font-bold text-xl">すてる</span>
        </div>
      </motion.div>

      <motion.div
        className="absolute inset-0 pointer-events-none flex items-center justify-center"
        style={{
          opacity: useTransform(y, [0, -100], [0, 1]),
        }}
      >
        <div className="bg-blue-500/20 rounded-lg px-6 py-3 border-2 border-blue-500">
          <span className="text-blue-600 font-bold text-xl">もう一度</span>
        </div>
      </motion.div>
    </motion.div>
  );
}