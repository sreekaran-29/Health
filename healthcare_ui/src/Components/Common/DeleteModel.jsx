import * as React from 'react';
import { MdDeleteForever, MdWarningAmber } from 'react-icons/md';

export default function DeleteModel({
	isOpen,
	title = 'Confirm Deletion',
	description,
	entityLabel = 'item',
	itemName,
	confirmText = 'Delete',
	onConfirm,
	onClose,
	isLoading = false,
	errorMessage = '',
}) {
	React.useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const handleEscape = (event) => {
			if (event.key === 'Escape' && !isLoading) {
				onClose?.();
			}
		};

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', handleEscape);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, isLoading, onClose]);

	if (!isOpen) {
		return null;
	}

	const resolvedDescription =
		description ||
		`This will permanently delete this ${entityLabel}. This action cannot be undone.`;

	return (
		<div
			className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50"
			style={{ zIndex: 2000 }}
			role="presentation"
			onClick={(event) => {
				if (event.target === event.currentTarget && !isLoading) {
					onClose?.();
				}
			}}
		>
			<div
				className="bg-white rounded-4 shadow-lg overflow-hidden w-100 mx-3"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				style={{ maxWidth: '520px' }}
			>
				<div className="p-4 bg-light border-bottom">
					<div>
						<div
							className="rounded-3 d-inline-flex align-items-center justify-content-center mb-2 bg-danger-subtle text-danger"
							style={{ width: '34px', height: '34px' }}
						>
							<MdDeleteForever size={20} />
						</div>
						<span className="mb-1 fw-bold fs-3 text-dark mx-2">
							{title}
						</span>
						<p className="mb-0 text-secondary small">
							{resolvedDescription}
						</p>
					</div>

					{itemName ? (
						<div className="mt-3 px-3 py-2 rounded-3 bg-white border">
							<span className="text-secondary small d-block">Selected {entityLabel}</span>
							<span className="fw-semibold text-dark">{itemName}</span>
						</div>
					) : null}

					{errorMessage ? (
						<div className="alert alert-danger mt-3 mb-0 rounded-3 px-3 py-2 d-flex align-items-center gap-2">
							<MdWarningAmber size={18} />
							<span className="small fw-semibold">{errorMessage}</span>
						</div>
					) : null}
				</div>

				<div className="p-3 d-flex flex-column flex-md-row justify-content-end gap-2">
					<button
						type="button"
						className="btn btn-light px-3 border"
						onClick={onClose}
						disabled={isLoading}
					>
						Cancel
					</button>
					<button
						type="button"
						className="btn btn-danger px-3 d-inline-flex align-items-center justify-content-center gap-2"
						onClick={onConfirm}
						disabled={isLoading}
					>
						{isLoading ? (
							<span
								className="spinner-border spinner-border-sm"
								role="status"
								aria-hidden="true"
							/>
						) : (
							<MdDeleteForever size={18} />
						)}
						<span>{isLoading ? 'Deleting...' : confirmText}</span>
					</button>
				</div>
			</div>
		</div>
	);
}
