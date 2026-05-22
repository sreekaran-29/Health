import React from 'react';
import { MdClose, MdContentCopy, MdLink } from 'react-icons/md';
import { toast } from 'react-toastify';
import SearchableDropdown from './SearchableDropdown';
import { getAllClientNames } from '../../Services/ClientService';
import { createPaymentLink, getAllPlansPrices } from '../../Services/SubscriptionService';

const BILLING_CYCLE_OPTIONS = [
	{ value: 'month', label: 'Monthly' },
	{ value: 'year', label: 'Yearly' },
];

const normalizeBillingMethod = (billingMethod) => {
	const value = String(billingMethod || '').toLowerCase();

	if (['month', 'monthly'].includes(value)) {
		return 'month';
	}

	if (['year', 'yearly'].includes(value)) {
		return 'year';
	}

	return '';
};

const toPriceText = (amount) => {
	const numericValue = Number(amount);

	if (!Number.isFinite(numericValue)) {
		return '';
	}

	return `$${numericValue}`;
};

const normalizeClients = (response) => {
	const source = Array.isArray(response?.data) ? response.data : [];

	return source
		.map((client) => ({
			id: client?.Id ?? null,
			name: client?.OrganizationName ?? '',
		}))
		.filter((client) => client.id !== null && String(client.name || '').trim());
};

const normalizePlans = (response) => {
	const source = Array.isArray(response?.data) ? response.data : [];

	return source
		.map((plan) => {
			const pricesSource = Array.isArray(plan?.prices) ? plan.prices : [];

			const prices = pricesSource
				.map((priceInfo) => {
					const billingMethod = normalizeBillingMethod(
						priceInfo?.billing_method,
					);

					return {
						id: priceInfo?.id ?? null,
						billingMethod,
						price: priceInfo?.price ?? null,
					};
				})
				.filter((priceInfo) => priceInfo.id !== null && priceInfo.billingMethod);

			return {
				id: plan?.id ?? null,
				name: plan?.name ?? '',
				prices,
			};
		})
		.filter((plan) => plan.id !== null && String(plan.name || '').trim());
};

const getIdFromData = (data) => data?.id ?? data?.Id ?? null;

export default function CreatePaymentLinkModal({
	isOpen,
	token,
	onClose,
	onRedirect,
	mode = 'add',
	initialData = null,
}) {
	const [loadingOptions, setLoadingOptions] = React.useState(false);
	const [submitting, setSubmitting] = React.useState(false);
	const [copying, setCopying] = React.useState(false);
	const [errorMessage, setErrorMessage] = React.useState('');

	const [clients, setClients] = React.useState([]);
	const [plans, setPlans] = React.useState([]);

	const [selectedClientId, setSelectedClientId] = React.useState('');

	const [selectedPlanId, setSelectedPlanId] = React.useState('');
	const [selectedBillingCycle, setSelectedBillingCycle] = React.useState('');
	const [selectedPriceId, setSelectedPriceId] = React.useState('');
	const [selectedPriceText, setSelectedPriceText] = React.useState('');

	const [result, setResult] = React.useState(null);

	const closeWithRedirectIfAny = React.useCallback(() => {
		const createdId = result?.subscriberId || null;
		onClose?.();

		if (createdId) {
			onRedirect?.(createdId);
		}
	}, [onClose, onRedirect, result]);

	React.useEffect(() => {
		if (!isOpen) {
			return undefined;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		const handleEscape = (event) => {
			if (event.key === 'Escape' && !submitting && !copying) {
				closeWithRedirectIfAny();
			}
		};

		window.addEventListener('keydown', handleEscape);

		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, submitting, copying, closeWithRedirectIfAny]);

	React.useEffect(() => {
		if (!isOpen || !token) {
			return;
		}

		const loadOptions = async () => {
			try {
				setLoadingOptions(true);
				setErrorMessage('');

				const [clientsResponse, plansResponse] = await Promise.all([
					getAllClientNames(token),
					getAllPlansPrices(token),
				]);

				setClients(normalizeClients(clientsResponse));
				setPlans(normalizePlans(plansResponse));
			} catch (error) {
				console.error(error);
				setClients([]);
				setPlans([]);
				setErrorMessage('Failed to load clients and subscriptions');
			} finally {
				setLoadingOptions(false);
			}
		};

		loadOptions();
	}, [isOpen, token]);

	React.useEffect(() => {
		if (!isOpen) {
			setLoadingOptions(false);
			setSubmitting(false);
			setCopying(false);
			setErrorMessage('');
			setClients([]);
			setPlans([]);
			setSelectedClientId('');
			setSelectedPlanId('');
			setSelectedBillingCycle('');
			setSelectedPriceId('');
			setSelectedPriceText('');
			setResult(null);
		}
	}, [isOpen]);

	React.useEffect(() => {
		if (!isOpen || !initialData || plans.length === 0 || clients.length === 0) {
			return;
		}

		const initialAccountId = String(initialData?.AccountId ?? initialData?.account_id ?? '');
		const initialPlanId = String(
			initialData?.SubscriptionPlanId ?? initialData?.subscription_plan_id ?? '',
		);
		const initialPriceId = String(
			initialData?.SubscriptionPriceId ?? initialData?.subscription_price_id ?? '',
		);

		if (initialAccountId) {
			const matchingClient = clients.find((client) => String(client.id) === initialAccountId);
			if (matchingClient) {
				setSelectedClientId(String(matchingClient.id));
			}
		}

		if (initialPlanId) {
			const matchingPlan = plans.find((plan) => String(plan.id) === initialPlanId);
			if (matchingPlan) {
				setSelectedPlanId(String(matchingPlan.id));

				if (initialPriceId) {
					const matchingPrice = matchingPlan.prices.find(
						(priceInfo) => String(priceInfo.id) === initialPriceId,
					);

					if (matchingPrice) {
						setSelectedBillingCycle(matchingPrice.billingMethod);
						setSelectedPriceId(String(matchingPrice.id));
						setSelectedPriceText(toPriceText(matchingPrice.price));
					}
				}
			}
		}
	}, [isOpen, initialData, plans, clients]);

	const clientOptions = React.useMemo(() => {
		return clients.map((client) => ({
			value: String(client.id),
			label: client.name,
		}));
	}, [clients]);

	const planOptions = React.useMemo(() => {
		return plans.map((plan) => ({
			value: String(plan.id),
			label: plan.name,
		}));
	}, [plans]);

	const selectedPlan = React.useMemo(() => {
		return plans.find((plan) => String(plan.id) === String(selectedPlanId)) || null;
	}, [plans, selectedPlanId]);

	const billingCycleOptions = React.useMemo(() => {
		if (!selectedPlan) {
			return [];
		}

		return BILLING_CYCLE_OPTIONS.filter((option) =>
			selectedPlan.prices.some((priceInfo) => priceInfo.billingMethod === option.value),
		);
	}, [selectedPlan]);

	const handlePlanChange = (planId) => {
		setSelectedPlanId(String(planId || ''));
		setSelectedBillingCycle('');
		setSelectedPriceId('');
		setSelectedPriceText('');
	};

	const handleBillingCycleChange = (event) => {
		const cycle = event.target.value;
		setSelectedBillingCycle(cycle);

		if (!selectedPlan) {
			setSelectedPriceId('');
			setSelectedPriceText('');
			return;
		}

		const matchingPrice = selectedPlan.prices.find((priceInfo) => priceInfo.billingMethod === cycle);

		if (!matchingPrice) {
			setSelectedPriceId('');
			setSelectedPriceText('');
			return;
		}

		setSelectedPriceId(String(matchingPrice.id));
		setSelectedPriceText(toPriceText(matchingPrice.price));
	};

	const handleCopyLink = async () => {
		if (!result?.paymentLink) {
			return;
		}

		try {
			setCopying(true);
			await navigator.clipboard.writeText(result.paymentLink);
			toast.success('URL copied to your clipboard');
		} catch (error) {
			console.error(error);
			toast.error('Failed to copy URL');
		} finally {
			setCopying(false);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();

		if (!selectedClientId || !selectedPlanId || !selectedPriceId) {
			setErrorMessage('Client, Subscription and Billing Cycle are required');
			return;
		}

		try {
			setSubmitting(true);
			setErrorMessage('');

			const payload = {
				Id: mode === 'edit' ? getIdFromData(initialData) : null,
				Type: mode === 'edit' ? 'update' : 'create',
				AccountId: selectedClientId,
				SubscriptionPlanId: selectedPlanId,
				SubscriptionPriceId: selectedPriceId,
			};

			const response = await createPaymentLink(payload, token);

			if (response?.status_code === 500) {
				setErrorMessage('Internal Server Error. Please Contact Support Team.');
				return;
			} else if (!response?.is_success) {
				setErrorMessage(response?.message || 'Failed to create payment link');
				return;
			}

			const responseData = response?.data || {};
			setResult({
				subscriberId: responseData?.Id || null,
				paymentLink: responseData?.PaymentLink || '',
			});
		} catch (error) {
			console.error(error);
			setErrorMessage('Failed to create payment link');
		} finally {
			setSubmitting(false);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<>
			<div
				className="modal d-block"
				tabIndex="-1"
				role="dialog"
				aria-modal="true"
				onMouseDown={(event) => {
					if (event.target === event.currentTarget && !submitting && !copying) {
						closeWithRedirectIfAny();
					}
				}}
			>
				<div className="modal-dialog modal-dialog-centered modal-lg">
					<div className="modal-content border-0 shadow">
						<div className="modal-header d-flex align-items-center justify-content-between">
							<h5 className="modal-title fw-bold hc-text-primary mb-0">
								{result ? 'Payment Link Generated' : mode === 'edit' ? 'Edit Payment Link' : 'Create Payment Link'}
							</h5>
							<button
								type="button"
								className="btn btn-sm btn-danger rounded-circle border d-inline-flex align-items-center justify-content-center"
								style={{ width: 30, height: 30 }}
								onClick={closeWithRedirectIfAny}
								disabled={submitting || copying}
							>
								<MdClose size={14} />
							</button>
						</div>

						<div className="modal-body">
							{result ? (
								<div>
									<div className="alert alert-success d-flex align-items-center gap-2 mb-3">
										<MdLink size={18} />
										<span className="small fw-semibold mb-0">Payment link created successfully.</span>
									</div>

									<label className="form-label fw-semibold">Payment URL</label>
									<div className="input-group">
										<input
											type="text"
											className="form-control"
											value={result.paymentLink}
											readOnly
										/>
										<button
											type="button"
											className="btn hc-bg-primary text-white d-inline-flex align-items-center gap-1"
											onClick={handleCopyLink}
											disabled={!result.paymentLink || copying}
										>
											<MdContentCopy size={16} />
											<span>{copying ? 'Copying...' : 'Copy URL'}</span>
										</button>
									</div>
								</div>
							) : (
								<form onSubmit={handleSubmit}>
									{errorMessage ? (
										<div className="alert alert-danger py-2 mb-3" role="alert">
											{errorMessage}
										</div>
									) : null}

									<div className="row g-3">
										<div className="col-12 col-md-6">
											<SearchableDropdown
												label="Client"
												placeholder="Select client"
												required
												options={clientOptions}
												value={selectedClientId}
												onChange={setSelectedClientId}
												disabled={submitting}
												loading={loadingOptions}
											/>
										</div>

										<div className="col-12 col-md-6">
											<SearchableDropdown
												label="Subscription"
												placeholder="Select subscription"
												required
												options={planOptions}
												value={selectedPlanId}
												onChange={handlePlanChange}
												disabled={submitting}
												loading={loadingOptions}
											/>
										</div>

										<div className="col-12 col-md-6">
											<label className="form-label fw-semibold">
												Billing Cycle <span className="text-danger">*</span>
											</label>
											<select
												className="form-select"
												value={selectedBillingCycle}
												onChange={handleBillingCycleChange}
												disabled={!selectedPlanId || submitting || loadingOptions}
											>
												<option value="">Select billing cycle</option>
												{billingCycleOptions.map((option) => (
													<option key={option.value} value={option.value}>
														{option.label}
													</option>
												))}
											</select>
										</div>

										<div className="col-12 col-md-6">
											<label className="form-label fw-semibold">Price</label>
											<input
												type="text"
												className="form-control"
												value={selectedPriceText}
												placeholder="$100"
												readOnly
											/>
										</div>
									</div>
								</form>
							)}
						</div>

						<div className="modal-footer">
							{result ? (
								<button
									type="button"
									className="btn hc-bg-primary text-white"
									onClick={closeWithRedirectIfAny}
									disabled={copying}
								>
									Close
								</button>
							) : (
								<>
									<button
										type="button"
										className="btn btn-light border"
										onClick={closeWithRedirectIfAny}
										disabled={submitting}
									>
										Cancel
									</button>
									<button
										type="button"
										className="btn hc-bg-primary text-white"
										onClick={handleSubmit}
										disabled={submitting || loadingOptions}
									>
										{submitting ? 'Saving...' : mode === 'edit' ? 'Update Link' : 'Create Link'}
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
			<div className="modal-backdrop fade show" />
		</>
	);
}
