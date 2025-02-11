import Head from "next/head";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { TextModel, Seq2SeqModel } from "@visheratin/web-ai";
import { split } from "sentence-splitter";

interface SentencePart {
  type: string;
  value: string;
}

const Diff = require("diff");

export default function Classification() {
  const [status, setStatus] = useState({ message: "ready", processing: false });
  const [output, setOutput] = useState({ value: "Here will be the output" });
  const [diff, setDiff] = useState({ value: "" });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputTimeout, setInputTimeout] = useState({ value: setTimeout(() => {}, 10) });

  useEffect(() => {
    loadModel();
  }, []);

  const [model, setModel] = useState({});

  const loadModel = async () => {
    setStatus({ message: "loading the model", processing: true });
    const result = await TextModel.create("grammar-t5-efficient-mini-quant");
    setModel({ instance: result.model as Seq2SeqModel });
    setStatus({ message: "ready", processing: false });
  };

  const inputChanged = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (inputTimeout.value) {
      clearTimeout(inputTimeout.value);
    }
    let timeout = setTimeout(processInput, 750);
    setInputTimeout({ value: timeout });
  };

  const splitText = (text: string): Array<SentencePart> => {
    let parts = split(text);
    let result: Array<SentencePart> = new Array<SentencePart>();
    for (let part of parts) {
      if (part.type === "Sentence") {
        for (let childNode of part.children) {
          result.push({ type: childNode.type, value: childNode.value });
        }
      } else {
        result.push({ type: part.type, value: part.value });
      }
    }
    return result;
  };

  const processInput = async () => {
    const value = inputRef.current?.value;
    if (value === "" || value === undefined) {
      return;
    }
    setStatus({ message: "processing", processing: true });
    let textParts = splitText(value);
    let output = "";
    for (let part of textParts) {
      if (part.type === "Str") {
        if (part.value.length < 2) {
          output = output.concat(part.value);
        } else {
          // @ts-ignore
          const partOutput = await model.instance.process(value);
          output = output.concat(partOutput.text);
          if (!partOutput.cached) {
            console.log(
              `Sentence of length ${part.value.length}(${partOutput.tokensNum} tokens) was processed in ${partOutput.elapsed} seconds`,
            );
          }
        }
      } else {
        if (!output.endsWith(part.value)) {
          output = output.concat(part.value);
        }
      }
    }
    setOutput({ value: output });
    const diff = Diff.diffChars(value, output);
    let diffValue = "";
    diff.forEach((part: any) => {
      if (part.added) {
        diffValue += `<span style="color: green; font-weight: bold">${part.value}</span>`;
      } else if (part.removed) {
        diffValue += `<span style="color: red; font-weight: bold">${part.value}</span>`;
      } else {
        diffValue += `${part.value}`;
      }
    });
    setDiff({ value: diffValue });
    setStatus({ message: "finished processing", processing: false });
  };

  return (
    <>
      <Head>
        <title>Web AI Next.js grammar correction example</title>
        <meta name="description" content="Web AI Next.js classification example" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main>
        <div className="container">
          <div className="row">
            <div className="col">
              <h1>Grammar correction example</h1>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col">
              <div className="d-flex align-items-center">
                <strong>Status: {status.message}</strong>
              </div>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-sm-12">
              <textarea
                ref={inputRef}
                className="form-control"
                onChange={inputChanged}
                rows={6}
                disabled={status.processing}
                placeholder="Start typing here"
              ></textarea>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-sm-12">
              <textarea
                className="form-control"
                disabled={!model || status.processing}
                value={output.value}
                rows={6}
              ></textarea>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-sm-12">
              <h6>Difference between input and output</h6>
              <div
                className="col-sm-12"
                style={{ minHeight: "50px" }}
                dangerouslySetInnerHTML={{ __html: diff.value }}
              ></div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
