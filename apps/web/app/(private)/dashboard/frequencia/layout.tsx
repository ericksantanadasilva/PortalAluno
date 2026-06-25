export default function FrequenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="-mx-4 md:-mx-8 -my-6 md:-my-6 flex flex-col min-h-full w-[calc(100%+2rem)] md:w-[calc(100%+4rem)]">
      {children}
    </div>
  );
}
