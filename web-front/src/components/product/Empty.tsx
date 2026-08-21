/**
 * 空态组件（UIUX §5.5：空态引导 + 一键重置，PRD 6.2.2 V1.6）
 */
export default function Empty({ message = "暂无匹配的产品", onReset }: { message?: string; onReset?: () => void }) {
  return (
    <div className="py-20 text-center">
      <p className="text-sm text-cream-3 mb-6">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="px-6 py-2.5 rounded-full border-[1.5px] border-gold text-gold-soft text-sm hover:bg-gold/15 transition-all"
        >
          清空全部筛选
        </button>
      )}
    </div>
  );
}
