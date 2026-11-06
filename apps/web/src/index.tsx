import "yosegi-solid/styles.css";
import "./styles/global.css";
import { render } from "@solidjs/web";
import { RootLayout } from "./layouts/root-layout";
import { Router } from "./router";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Missing #root element in index.html");
}

render(() => <Router>{(props) => <RootLayout>{props.children}</RootLayout>}</Router>, root);
