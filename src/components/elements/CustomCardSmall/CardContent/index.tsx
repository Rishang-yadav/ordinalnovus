import React, { useEffect, useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import STL from "../../STLViewer";
import GLTF from "../../GLTFViewer";

import JSZip from "jszip";
import AudioPlayer from "../../AudioPlayer";
import mixpanel from "mixpanel-browser";
import {
  bitmap_format_validator,
  domain_format_validator,
  stringToHex,
} from "@/utils";
import { IInscription } from "@/types";
import { Icbrc } from "@/types/CBRC";
import { useSelector } from "react-redux";
import { RootState } from "@/stores";
import { cbrcValid } from "@/utils/validate";

type CardContentProps = {
  inscriptionId: string;
  content_type?: string;
  content?: string;
  className?: string;
  showFull?: boolean;
  inscription?: IInscription;
  cbrc?: Icbrc;
  loadingVerticalPadding?: boolean;
  loadingRoundedOverride?: string;
};

const CardContent: React.FC<CardContentProps> = ({
  inscriptionId,
  content_type,
  content,
  className,
  showFull = false,
  inscription,
  cbrc,
  loadingVerticalPadding = true,
  loadingRoundedOverride = "rounded-xl",
}) => {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [fetchedContent, setFetchedContent] = useState<string | undefined>(
    content
  );
  const [fetchedContentType, setFetchedContentType] = useState<
    string | undefined
  >(content_type);

  useEffect(() => {
    if (!cbrc) {
      setIsLoading(true); // Set isLoading to true when starting the fetch
      fetch(`/content/${inscriptionId}`)
        .then((response: any) => {
          if (!response.ok) {
            throw new Error("HTTP error " + response.status);
          }
          setFetchedContentType(response?.headers?.get("Content-Type") + "");

          // Check the content type to decide how to parse the response
          const contentType = response?.headers?.get("Content-Type") + "";
          if (
            contentType === "application/zip" ||
            contentType === "application/x-zip-compressed"
          ) {
            // For zip files, use arrayBuffer
            return response.arrayBuffer();
          } else {
            // For other content types, use text
            return response.text();
          }
        })
        .then((data) => {
          setFetchedContent(data);
        })
        .catch((error) => {
          console.error("Fetching error: ", error);
        })
        .finally(() => {
          setIsLoading(false); // Set isLoading to false when fetch is completed
        });
    } else {
      setIsLoading(false);
      setFetchedContent("cbrc");
    }
  }, [inscriptionId, cbrc]);

  const renderContent = (showFull: boolean) => {
    if (cbrc) {
      return (
        <div className="w-full h-full flex flex-col justify-center items-center text-xs tracking-widest  py-12">
          <p className="text-3xl uppercase">{cbrc.tick}</p>
          <hr />
          <p className=" font-bold">Max: {cbrc.max}</p>
          <p className=" font-bold">Limit: {cbrc.lim}</p>
          <hr className="mt-2" />
          <p>Minted: {((cbrc.supply / cbrc.max) * 100).toFixed(3)}%</p>
          {cbrc.fp ? <p>FP: {cbrc?.fp} USD</p> : <></>}
        </div>
      );
    } else if (
      (inscription?.metaprotocol?.includes("cbrc-20:mint") ||
        inscription?.metaprotocol?.includes("cbrc-20:transfer")) &&
      inscription?.tags?.includes("text") &&
      inscription?.content_type?.includes("plain")
    ) {
      const [tag, mode, tokenAmt] = inscription.metaprotocol.split(":");
      const [token, amt] = tokenAmt.split("=");

      return (
        <div
          className={`w-full h-full flex flex-col justify-center items-center text-sm tracking-widest py-12 xl:py-24`}
        >
          <p className="uppercase">{mode}</p>
          <p className="text-3xl">{amt}</p>
          <hr />
          <p className="uppercase font-sourcecode">{token}</p>
        </div>
      );
    } else if (
      !content_type &&
      (inscription?.metaprotocol?.includes("cbrc-20:mint") ||
        inscription?.metaprotocol?.includes("cbrc-20:transfer"))
    ) {
      const [_tag, mode, tokenAmt] = inscription.metaprotocol.split(":");
      const [token, amt] = tokenAmt.split("=");

      return (
        <div
          className={`w-full h-full flex flex-col justify-center items-center text-sm tracking-widest  py-12 font-sourcecode `}
        >
          <p className="uppercase">{mode}</p>
          <p className="text-3xl">{amt}</p>
          <hr />
          <p className="uppercase font-sourcecode">{token}</p>
        </div>
      );
    } else if (
      !content_type &&
      !inscription?.content &&
      !inscription?.metaprotocol
    ) {
      return (
        <div
          className={`w-full h-full flex flex-col justify-center items-center text-sm tracking-widest  py-12 font-sourcecode `}
        >
          NO CONTENT
        </div>
      );
    }
    const contentType = fetchedContentType
      ? fetchedContentType
      : "No content type provided";
    switch (contentType.split(" ").join("")) {
      case "image/jpeg":
      case "image/png":
      case "image/gif":
      case "image/webp":
      case "image/avif":
      case "image/svg+xml":
      case "image/svg+xml;charset=utf-8":
        //@ts-ignore
        return (
          <div
            className={`${
              className ? className : "w-full h-full center no-scrollbar"
            }`}
          >
            <img
              style={{
                imageRendering: "pixelated",
                width: "inherit",
                height: "inherit",
                borderRadius: "inherit",
                objectFit: "inherit",
              }}
              className=""
              src={`/content/${inscriptionId}`}
              alt={inscriptionId}
            />
          </div>
        );
      case "audio/mpeg":
      case "audio/midi":
      case "audio/mod":
        return <AudioPlayer inscriptionId={inscriptionId} />;
      case "video/mp4":
      case "video/avi":
      case "video/webm":
        return (
          <video
            className="object-cover w-full h-full"
            muted
            autoPlay
            src={`/content/${inscriptionId}`}
            controls
          />
        );
      case "application/json":
      case "application/json;charset=utf-8":
        let jsonContent;

        try {
          let parsedJson = JSON.parse(fetchedContent + "");
          jsonContent = JSON.stringify(
            JSON.parse(fetchedContent + ""),
            null,
            2
          );

          if (parsedJson.p && parsedJson.op && parsedJson.name) {
            return (
              <div className="w-full h-full flex flex-col justify-center items-center text-sm tracking-widest py-12">
                <p className="text-3xl">{parsedJson.name}</p>
              </div>
            );
          }
        } catch (error) {
          console.error("Error parsing JSON: ", error);
          jsonContent = fetchedContent;
        }
        return (
          <pre className="whitespace-pre-wrap p-2 text-white py-12">
            {jsonContent}
          </pre>
        );
      case "text/plain":
      case "text/javascript":
      case "text/plain;charset=utf-8":
      case "application/javascript":
        let parsedJson;
        try {
          parsedJson = JSON.parse(fetchedContent + "");
        } catch (error) {
          parsedJson = null;
        }

        if (parsedJson) {
          // If the content is valid JSON, display it as JSON
          let jsonContent;
          try {
            jsonContent = JSON.stringify(parsedJson, null, 2);
          } catch (error) {
            console.error("Error parsing JSON: ", error);
            jsonContent = fetchedContent;
          }
          if (parsedJson.op && parsedJson.tick && parsedJson.amt) {
            return (
              <div className="w-full h-full flex flex-col justify-center items-center text-sm tracking-widest  py-12">
                <p className="uppercase">{parsedJson.op}</p>
                <p className="text-3xl">{parsedJson.amt}</p>
                <hr />
                <p className="uppercase font-bold">{parsedJson.tick}</p>
              </div>
            );
          } else if (parsedJson.p && parsedJson.op && parsedJson.name) {
            return (
              <div className="w-full h-full flex flex-col justify-center items-center text-sm tracking-widest py-12">
                <p className="text-3xl">{parsedJson.name}</p>
              </div>
            );
          } else if (
            parsedJson.p &&
            parsedJson.op &&
            parsedJson.tick &&
            parsedJson.max &&
            parsedJson.lim
          ) {
            return (
              <div className="w-full h-full flex flex-col justify-center items-center text-sm tracking-widest py-12">
                <p className="uppercase">{parsedJson.op}</p>
                <p className="text-xl">{parsedJson.max}</p>
                <p className="uppercase font-bold">{parsedJson.tick}</p>
                <hr className="mb-2" />
                <hr className="mb-2" />
                <p className="text-xs font-bold">Limit: {parsedJson.lim}</p>
              </div>
            );
          }
          return (
            <pre className="whitespace-pre-wrap p-2 text-white overflow-y-auto max-h-full py-12">
              {!showFull && jsonContent && jsonContent?.length > 60
                ? jsonContent?.slice(0, 60)
                : jsonContent}
            </pre>
          );
        }

      case "text/markdown":
      case "text/markdown;charset=utf-8":
        const truncatedMarkdown =
          fetchedContent && fetchedContent.length > 150
            ? fetchedContent.slice(0, 150) + "..."
            : fetchedContent;
        return (
          <div className="p-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="markdown-content overflow-y-auto" // Add a CSS class to the ReactMarkdown component
              components={{
                p: ({ children }) => (
                  <p className="text-gray-500 text-xs py-2">{children}</p>
                ),
                h1: ({ children }) => (
                  <h1 className="text-white text-xl underline uppercase pt-4 pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-white text-lg font-bold pb-2">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-gray-400 text-md font-medium pb-2">
                    {children}
                  </h3>
                ),
                span: ({ children }) => (
                  <span className="text-gray-300">{children}</span>
                ),
                a: ({ children, href }) => (
                  <a className="text-blue-500 hover:text-blue-700" href={href}>
                    {children}
                  </a>
                ),
                br: () => <br />,
                hr: () => <hr className="border-gray-400 my-4" />,
                ul: ({ children }) => (
                  <ul className="list-disc ml-6">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal ml-6">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
                // Add styling for other Markdown elements as needed
              }}
            >
              {!showFull ? truncatedMarkdown : fetchedContent + ""}
            </ReactMarkdown>
          </div>
        );
      case "application/pdf":
        return (
          <iframe
            className="no-scrollbar"
            src={`/content/${inscriptionId}`}
            style={{ width: "100%", height: "100%" }}
          />
        );
      case "text/html;charset=utf-8":
      case "text/html":
        return (
          <div className={`${className ? className : "w-full h-full"}`}>
            <iframe
              sandbox="allow-scripts"
              className={className || " no-scrollbar   w-[300px] h-[300px]"}
              src={`/content/${inscriptionId}`}
              style={{ minWidth: "100%", minHeight: "100%" }}
            />
          </div>
        );
      case "model/stl":
        return <STL url={`/content/${inscriptionId}`} />;
      case "model/gltf-binary":
      case "model/gltf+json":
        if (fetchedContent?.includes("/content/")) {
          return <GLTF url={fetchedContent} />;
        }
        return <GLTF url={`/content/${inscriptionId}`} />;
      case "application/zip":
      case "application/x-zip-compressed":
      case "application/zip":
      case "application/x-zip-compressed":
        // Load and read the contents of the zip file using JSZip
        const zip = new JSZip();
        //@ts-ignore
        zip.loadAsync(fetchedContent).then((zip) => {
          let names: string[] = [];
          zip.forEach((relativePath, file) => {
            names.push(relativePath);
          });
          setFileNames(names);
        });
        return (
          <div className="p-2">
            <h4 className="uppercase text-center font-bold pb-2 text-white">
              Zip Archive
            </h4>
            <ul>
              {fileNames.map((name, index) => (
                <li className="text-xs underline " key={index}>
                  {name}
                </li>
              ))}
            </ul>
          </div>
        );
      default:
        // Mixpanel Tracking for Unsupported Content Type
        mixpanel.track("Error", {
          content_type: contentType,
          inscription_id: inscriptionId,
          tag: "unsupported content type",
          // Additional properties if needed
        });
        return <div>Unsupported content type: {contentType}</div>;
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto overflow-x-hidden no-scrollbar min-w-full min-h-full">
      {isLoading ? (
        <div
          className={`flex justify-center items-center  h-full text-white ${
            loadingVerticalPadding ? "py-6" : ""
          }  w-full`}
        >
          {/* <CircularProgress color="inherit" size={10} />{" "} */}
          <div
            className={`${
              className ? className : "w-full h-full center no-scrollbar"
            }`}
            // className="min-h-[100px] lg:w-full relative rounded-xl overflow-hidden"
          >
            <div
              className={`relative bg-gray-500 animate-pulse overflow-hidden w-full h-full aspect-square ${loadingRoundedOverride}`}
            ></div>
          </div>
          {/* Display the loading component */}
        </div>
      ) : fetchedContent ? (
        renderContent(showFull)
      ) : (
        <div
          className={`flex justify-center items-center h-full text-white ${
            loadingVerticalPadding ? "py-6" : ""
          }  w-full`}
        >
          {/* <CircularProgress color="inherit" size={10} />{" "} */}
          <div
            className={`${
              className ? className : "w-full h-full center no-scrollbar"
            }`}
            // className="min-h-[100px] lg:w-full relative rounded-xl overflow-hidden"
          >
            <div
              className={`relative bg-gray-500 animate-pulse overflow-hidden w-full h-full aspect-square ${loadingRoundedOverride}`}
            ></div>
          </div>
          {/* Display the loading component */}
        </div>
      )}
    </div>
  );
};

export default CardContent;
