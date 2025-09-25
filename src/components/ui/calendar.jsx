export function Calendar({ selected, onSelect }) {
  return <input type="date" value={selected} onChange={(e)=>onSelect(new Date(e.target.value))}/>;
}
