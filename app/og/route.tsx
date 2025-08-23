import { ImageResponse } from "next/og";

export function GET(request: Request) {
  let url = new URL(request.url);
  let title = url.searchParams.get("title") || "Taichi Nakashima";
  let summary = url.searchParams.get("summary") || "";

  return new ImageResponse(
    (
      <div tw="flex flex-col w-full h-full items-start justify-center bg-white border-2 border-gray-100 p-16">
        <div tw="flex flex-col w-full max-w-4xl">
          <h1 tw="text-5xl font-bold tracking-tight text-black mb-6 leading-tight">
            {title}
          </h1>
          {summary && (
            <p tw="text-2xl text-gray-700 leading-relaxed mb-8 max-w-3xl">
              {summary}
            </p>
          )}
          <div tw="flex items-center text-xl text-gray-500 mt-auto">
            <span tw="mr-3">deeeet.com</span>
            <div tw="w-6 h-6 bg-black rounded-full flex items-center justify-center">
              <span tw="text-white text-sm font-bold">T</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
