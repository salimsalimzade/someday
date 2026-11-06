import { Button, NotFound } from "yosegi-solid";
import { paths } from "../router";

export default function NotFoundPage() {
  return (
    <NotFound
      code="404"
      title="Page not found"
      description="The page you're looking for doesn't exist."
      actions={<Button as="a" href={String(paths())} label="Go home" />}
    />
  );
}
