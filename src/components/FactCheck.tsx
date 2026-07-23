import { CheckIcon, AlertTriangle } from "lucide-react";
import { Citation } from "@/lib/types";
import { truncateUrl } from "@/lib/utils";

export function FactCheck({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div data-test-id="fact-check">
      <div className="border border-slate-200 bg-slate-100/30 shadow-md rounded-lg overflow-hidden text-sm py-2">
        {citations.map((citation, index) => (
          <div key={index} data-test-id="fact-check-item" className="flex">
            <div className="w-8">
              <div
                className={`w-4 h-4 flex items-center justify-center rounded-full mt-[10px] ml-[12px] ${
                  citation.supported ? "bg-green-600" : "bg-amber-500"
                }`}
                data-test-id={
                  citation.supported
                    ? "fact-check-item_supported"
                    : "fact-check-item_unsupported"
                }
              >
                {citation.supported ? (
                  <CheckIcon className="w-3 h-3 text-white" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-white" />
                )}
              </div>
            </div>
            <div className="flex-1 py-2 pl-2 pr-4">
              <div className="text-xs">{citation.claim}</div>
              {citation.resource_urls.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  {citation.resource_urls.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:underline"
                      title={url}
                    >
                      {truncateUrl(url)}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-1 text-xs text-amber-600">
                  No supporting source found
                  {citation.note ? ` — ${citation.note}` : ""}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
