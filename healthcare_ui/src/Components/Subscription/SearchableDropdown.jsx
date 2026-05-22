import React from 'react';
import { MdCheck, MdExpandMore, MdSearch } from 'react-icons/md';

export default function SearchableDropdown({
	label,
	placeholder = 'Select',
	options = [],
	value = '',
	onChange,
	disabled = false,
	loading = false,
	required = false,
	emptyMessage = 'No results found',
}) {
	const wrapperRef = React.useRef(null);
	const searchInputRef = React.useRef(null);

	const [isOpen, setIsOpen] = React.useState(false);
	const [searchText, setSearchText] = React.useState('');

	const selectedOption = React.useMemo(() => {
		return options.find((option) => String(option.value) === String(value)) || null;
	}, [options, value]);

	const filteredOptions = React.useMemo(() => {
		const term = searchText.trim().toLowerCase();

		if (!term) {
			return options;
		}

		return options.filter((option) => String(option.label || '').toLowerCase().includes(term));
	}, [options, searchText]);

	React.useEffect(() => {
		if (!isOpen) {
			setSearchText('');
			return;
		}

		const timer = window.setTimeout(() => {
			searchInputRef.current?.focus();
		}, 0);

		return () => window.clearTimeout(timer);
	}, [isOpen]);

	React.useEffect(() => {
		if (!isOpen) {
			return;
		}

		const handleClickOutside = (event) => {
			if (!wrapperRef.current?.contains(event.target)) {
				setIsOpen(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [isOpen]);

	const handleSelect = (optionValue) => {
		onChange?.(optionValue);
		setIsOpen(false);
	};

	return (
		<div className="position-relative" ref={wrapperRef}>
			<label className="form-label fw-semibold mb-2">
				{label}
				{required ? <span className="text-danger ms-1">*</span> : null}
			</label>

			<button
				type="button"
				className="form-control d-flex align-items-center justify-content-between text-start"
				onClick={() => !disabled && setIsOpen((previous) => !previous)}
				disabled={disabled}
			>
				<span className={selectedOption ? 'text-dark' : 'text-secondary'}>
					{selectedOption?.label || placeholder}
				</span>
				<MdExpandMore size={18} className="text-secondary" />
			</button>

			<div
				className={`dropdown-menu w-100 mt-1 p-2 shadow ${isOpen ? 'show' : ''}`}
				style={{ maxHeight: 280, overflowY: 'auto' }}
			>
				<div className="position-relative mb-2">
					<span
						className="position-absolute top-50 translate-middle-y text-secondary"
						style={{ left: 10, lineHeight: 0 }}
					>
						<MdSearch size={16} />
					</span>
					<input
						ref={searchInputRef}
						type="text"
						className="form-control form-control-sm"
						placeholder="Search..."
						value={searchText}
						onChange={(event) => setSearchText(event.target.value)}
						onClick={(event) => event.stopPropagation()}
						disabled={loading}
						style={{ paddingLeft: 30 }}
					/>
				</div>

				{loading ? (
					<div className="px-1 py-1">
						<div className="placeholder-glow mb-2">
							<span className="placeholder col-12 rounded-2" style={{ height: 28 }} />
						</div>
						<div className="placeholder-glow mb-2">
							<span className="placeholder col-10 rounded-2" style={{ height: 28 }} />
						</div>
						<div className="placeholder-glow">
							<span className="placeholder col-11 rounded-2" style={{ height: 28 }} />
						</div>
					</div>
				) : filteredOptions.length > 0 ? (
					filteredOptions.map((option) => {
						const isSelected = String(option.value) === String(value);

						return (
							<button
								key={option.value}
								type="button"
								className={`dropdown-item rounded-2 d-flex align-items-center justify-content-between ${
									isSelected ? 'active' : ''
								}`}
								onClick={() => handleSelect(option.value)}
							>
								<span>{option.label}</span>
								{isSelected ? <MdCheck size={16} /> : null}
							</button>
						);
					})
				) : (
					<div className="px-2 py-2 text-secondary small">{emptyMessage}</div>
				)}
			</div>
		</div>
	);
}
