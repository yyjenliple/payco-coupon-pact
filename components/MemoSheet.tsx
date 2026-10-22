"use client";

import { Lock } from "lucide-react";
import { useState, useTransition } from "react";
import { saveMemoAction } from "@/app/actions/common";
import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

export const MEMO_MAX = 200;

export function MemoTextarea({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor="memo" className="text-[13px] font-medium text-sub">
          내 메모
        </label>
        <span className="flex items-center gap-1 text-xs text-sub">
          <Lock size={12} />
          나만 볼 수 있어요
        </span>
      </div>
      <div className="flex flex-col rounded-xl border border-line px-3.5 py-3 focus-within:border-[1.5px] focus-within:border-ink">
        <textarea
          id="memo"
          value={value}
          autoFocus={autoFocus}
          maxLength={MEMO_MAX}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="resize-none bg-transparent text-[15px] leading-normal outline-none"
        />
        <span className="self-end font-num text-xs text-sub">
          {value.length}/{MEMO_MAX}
        </span>
      </div>
    </div>
  );
}

/** Memo editor used right after giving a coupon. */
export function MemoSheet({ transferId, onClose }: { transferId: number | null; onClose: () => void }) {
  const [body, setBody] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Sheet open={transferId !== null} onClose={onClose} title="메모 남기기">
      <div className="flex flex-col gap-5">
        <MemoTextarea value={body} onChange={setBody} autoFocus />
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveMemoAction(transferId!, body);
              if (!result.ok) return toast.show({ message: result.error });
              setBody("");
              onClose();
              toast.show({ message: "메모를 저장했어요" });
            })
          }
        >
          메모 저장
        </Button>
      </div>
    </Sheet>
  );
}
