"use client";

import { Loading } from "@/shared/components/loading";
import { Input } from "@/shared/components/ui/input";
import { Progress } from "@/shared/components/ui/progress";
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { useCreation, useMemoizedFn } from "ahooks";
import { sentenceCase } from "change-case";
import { useObservable } from "rcrx";
import React, { useEffect, useRef, useState } from "react";
import { Observable, throttleTime } from "rxjs";
import { IUploadClientActions, UploadClient } from "../models/client";

export interface IUploaderProps {
  actions: IUploadClientActions;
}

export const Uploader: React.FC<IUploaderProps> = ({ actions }) => {
  const [files, setFiles] = useState<File[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainer = scrollContainerRef.current;

  const onChange = useMemoizedFn((async (e) => {
    const files = Array.from(e.target.files ?? []);
    setFiles((pre) => [...pre, ...files]);

    if (scrollContainer) {
      setTimeout(() => {
        (scrollContainer.lastChild as HTMLDivElement | null)?.scrollIntoView({
          behavior: "smooth",
        });
      }, 200);
    }
  }) satisfies React.ComponentProps<"input">["onChange"]);

  return (
    <div className="flex flex-col gap-4 border border-solid p-4">
      <Input multiple type="file" onChange={onChange} />

      <div ref={scrollContainerRef} className="h-64 overflow-auto">
        {files.map((file, index) => (
          <UploadSingleFile
            key={file.name + index}
            actions={actions}
            file={file}
          />
        ))}
      </div>
    </div>
  );
};

interface IUploaderStateProps {
  file: File;
  actions: IUploadClientActions;
}
function UploadSingleFile(props: IUploaderStateProps) {
  const { file, actions } = props;

  const ui = useCreation(
    () => new UploadClient(file, actions),
    [file, actions]
  );

  useEffect(() => {
    ui.start(true);
  }, [ui]);

  const onPlay = useMemoizedFn(() => {
    ui.startPool();
  });

  const onStop = useMemoizedFn(() => {
    ui.stopPool();
  });

  const state = useObservable(
    ui.state$.pipe(
      throttleTime(200, undefined, { leading: false, trailing: true })
    ),
    ui.state$.value
  );

  return (
    <div className="py-2">
      <div
        title={file.name}
        className="flex text-sm mb-2 justify-between gap-4"
      >
        <span className="truncate">{file.name}</span>
        <span className="whitespace-nowrap">
          {state !== UploadClient.EState.Default &&
            sentenceCase(UploadClient.EState[state])}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <RxProgress value$={ui.progress$} />
        <div className="w-16 flex items-center justify-center">
          <UploaderController
            state$={ui.state$}
            onPlay={onPlay}
            onStop={onStop}
          />
        </div>
      </div>
    </div>
  );
}

interface IUploaderControllerProps {
  onPlay?: () => void;
  onStop?: () => void;
  state$: UploadClient["state$"];
}
const UploaderController: React.FC<IUploaderControllerProps> = ({
  onPlay,
  onStop,
  state$,
}) => {
  const state = useObservable(
    state$.pipe(
      throttleTime(200, undefined, { leading: false, trailing: true })
    ),
    state$.value
  );

  switch (state) {
    case UploadClient.EState.Default:
      return null;

    case UploadClient.EState.CalculatingHash:
      return <span className="text-xs">Analysis...</span>;

    case UploadClient.EState.WaitForUpload:
    case UploadClient.EState.UploadStopped:
      return <PlayIcon onClick={onPlay} className="cursor-pointer" />;

    case UploadClient.EState.Uploading:
      return <PauseIcon onClick={onStop} className="cursor-pointer" />;

    case UploadClient.EState.UploadSuccessfully:
      return <CheckIcon />;

    case UploadClient.EState.FastUploaded:
      return <RocketIcon />;

    default:
      return <Loading />;
  }
};

interface IUploaderInfoProps {
  value$: Observable<number>;
}
const RxProgress: React.FC<IUploaderInfoProps> = ({ value$ }) => {
  const value = useObservable(value$, 0);

  return <Progress className="h-1 my-2" value={value} />;
};
