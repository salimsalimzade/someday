// Apps compile this package with Vite, which turns *.module.css into a class map.
declare module "*.module.css" {
  const classes: { readonly [name: string]: string };
  export default classes;
}
