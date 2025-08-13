"use client";

type Props = {
  filter: string;
  sort: string;
  onChange: (next: { filter?: string; sort?: string }) => void;
};

export default function FilterControls({ filter, sort, onChange }: Props) {
  return (
    <div className="card" role="region" aria-label="Filters">
      <div className="row-actions" style={{ gap: 12 }}>
        <label className="stack-label">
          <span className="muted">Filter</span>
          <select
            className="input touch"
            value={filter}
            onChange={(e) => onChange({ filter: e.target.value })}
          >
            <option value="all">All</option>
            <option value="mine">My surveys</option>
            <option value="public">Public only</option>
            <option value="private">Private only</option>
          </select>
        </label>

        <label className="stack-label">
          <span className="muted">Sort</span>
          <select
            className="input touch"
            value={sort}
            onChange={(e) => onChange({ sort: e.target.value })}
          >
            <option value="new">Newest first</option>
            <option value="title">Title A–Z</option>
            <option value="votes">Most votes</option>
          </select>
        </label>
      </div>
    </div>
  );
}
