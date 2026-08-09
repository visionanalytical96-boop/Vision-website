// Renders a JSON-LD <script> tag. JSON.stringify already escapes quotes,
// but a literal "</script>" inside string data (e.g. a product description)
// could still break out of the tag - escape "<" to neutralize that.
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
