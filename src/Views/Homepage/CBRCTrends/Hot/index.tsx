import { IStats } from "@/types";
import Link from "next/link";
import React from "react";

const Hot = ({ data }: { data: IStats }) => {
  return (
    <div className="py-8 px-6 rounded-lg bg-primary h-full border-transparent hover:border-accent border-[1px] transition-all duration-700">
      <div className="pb-4 flex items-center justify-between">
        <div className="flex items-center ">
          <div>
            <img src="/static-assets/images/hot.png" />
          </div>
          <div>
            <p className="font-semibold text-xl text-white pl-2 ">Hot</p>
          </div>
        </div>
        <div className="text-white ">
          <p>In Mempool</p>
        </div>
      </div>
      {data.tokensHot.map((item, index) => {
        return (
          <div key={index} className=" py-3  flex justify-between items-center">
            <div>
              <div className=" uppercase flex items-center  text-white font-medium">
                <Link href={`/cbrc-20/${item.tick}`}>
                  <div className="flex items-center ">
                    {item.icon ? (
                      <div className=" rounded-full w-7 h-7 border border-white">
                        <img
                          src={item.icon}
                          alt="Icon"
                          className=" object-cover w-full h-full overflow-none rounded-full " // Adjust width and height as needed
                        />
                      </div>
                    ) : (
                      <div className="">
                        <div
                          className="rounded-full w-7 h-7 border border-white flex justify-center items-center bg-accent" // Use your secondary color here
                          style={{ lineHeight: "1.5rem" }} // Adjust line height to match your text size
                        >
                          {item.tick.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                    <div className="pl-3"> {item.tick}</div>
                  </div>
                </Link>
              </div>
            </div>
            <div className=" flex items-center">
              {item.in_mempool > 0 && (
                <span className="pl-2">{item.in_mempool}</span>
              )}
              <div className="pl-2">
                <img
                  className="w-6 h-6"
                  src="/static-assets/images/pending.gif"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Hot;
