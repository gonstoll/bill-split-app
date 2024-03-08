export function ErrorList({
  id,
  errors,
}: {
  id?: string
  errors?: Array<string> | null
}) {
  return errors?.length ? (
    <ul id={id} className="flex flex-col gap-1">
      {errors.map((error, i) => (
        <li key={i} className="text-sm text-destructive">
          {error}
        </li>
      ))}
    </ul>
  ) : null
}
