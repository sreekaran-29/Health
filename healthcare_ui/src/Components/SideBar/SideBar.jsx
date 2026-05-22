import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MdExpandLess, MdExpandMore, MdLogout, MdSearch } from "react-icons/md";
import NAV from "../../Utils/MenuData";
import brandLogo from "../../Assets/Images/Aegis Logo.jpg";
import "../../Styles/SidebarLayout.css";
import { useAuth } from "../../Context/AuthContext";

const findActiveKeyByPath = (pathname) => {
  for (const item of NAV) {
    const itemRoute = item.page || item.path;

    if (itemRoute && pathname.startsWith(itemRoute)) {
      return { key: item.label, parent: null };
    }

    if (item.children?.length) {
      for (const child of item.children) {
        const childRoute = child.page || child.path;

        if (childRoute && pathname.startsWith(childRoute)) {
          return {
            key: `${item.label}/${child.label}`,
            parent: item.label,
          };
        }
      }
    }
  }

  return { key: null, parent: null };
};

export default function SideBar({ onNavigate, onLogout }) {
	const navigate = useNavigate();
	const location = useLocation();
	const [query, setQuery] = useState("");
	const [activeMenu, setActiveMenu] = useState(() => {
		const { key } = findActiveKeyByPath(location.pathname);
		return key || null;
	});
	const [expanded, setExpanded] = useState(() => {
		const { parent } = findActiveKeyByPath(location.pathname);
		return {
			Subscription: true,
			Services: true,
			...(parent ? { [parent]: true } : {}),
		};
	});
	const { decodedToken } = useAuth();
	const userRole = decodedToken?.role || "";

	useEffect(() => {
		const { key, parent } = findActiveKeyByPath(location.pathname);
		if (key) {
			setActiveMenu(key);
			if (parent) {
				setExpanded((prev) => ({ ...prev, [parent]: true }));
			}
		}
	}, [location.pathname]);

	const filteredMenu = useMemo(() => {
		const term = query.trim().toLowerCase();

		let menu = NAV;
		if (userRole.toLowerCase() !== "super admin") {
			menu = NAV.filter((item) =>
				item.label !== "Subscription" && item.label !== "Audit Logs"
			);
		}

		if (!term) {
			return menu;
		}

		return menu
			.map((item) => {
				const labelMatches = item.label.toLowerCase().includes(term);
				const children = item.children?.filter((child) =>
					child.label.toLowerCase().includes(term)
				);

				if (labelMatches) {
					return item;
				}

				if (children?.length) {
					return { ...item, children };
				}

				return null;
			})
			.filter(Boolean);
	}, [query, userRole]);

	const selectMenu = (key, page) => {
		setActiveMenu(key);

		if (page) {
			navigate(page);
		}

		if (onNavigate) {
			onNavigate(page);
		}
	};

	const toggleExpanded = (label) => {
		setExpanded((prev) => ({
			...prev,
			[label]: !prev[label],
		}));
	};

	const handleLogoutClick = () => {
		if (onLogout) {
			onLogout();
		}

		if (onNavigate) {
			onNavigate();
		}
	};

	return (
		<div className="hc-sidebar">
			<div className="hc-sidebar-brand">
				<div className="hc-brand-mark">
					<img src={brandLogo} alt="Aegis Healthcare" className="hc-brand-logo" />
				</div>
				<div className="hc-brand-copy">
					<h2>AEGIS HEALTHCARE</h2>
					<p>Admin Console</p>
				</div>
			</div>

			<div className="hc-sidebar-search">
				<MdSearch size={18} />
				<input
					type="text"
					placeholder="Search menu"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					aria-label="Search menu"
				/>
			</div>

			<nav className="hc-sidebar-nav" aria-label="Main">
				{filteredMenu.map((item) => {
					const hasChildren = Boolean(item.children?.length);
					const isOpen = Boolean(expanded[item.label]);
					const parentActive = activeMenu === item.label;

					return (
						<div className="hc-menu-block" key={item.label}>
							<button
								type="button"
								className={`hc-menu-item ${parentActive ? "active" : ""}`}
								onClick={() => {
									if (hasChildren) {
										toggleExpanded(item.label);
									} else {
										selectMenu(item.label, item.page || item.path);
									}
								}}
							>
								<span className="hc-menu-left">
									<span className="hc-menu-icon">{item.icon}</span>
									<span>{item.label}</span>
								</span>
								{hasChildren ? (
									<span className="hc-menu-expand-icon">
										{isOpen ? <MdExpandLess size={18} /> : <MdExpandMore size={18} />}
									</span>
								) : null}
							</button>

							{hasChildren && isOpen ? (
								<div className="hc-submenu-wrap">
									{item.children.map((child) => {
										const key = `${item.label}/${child.label}`;
										const childActive = activeMenu === key;

										return (
											<button
												key={key}
												type="button"
												className={`hc-submenu-item ${childActive ? "active" : ""}`}
												onClick={() => selectMenu(key, child.page || child.path)}
											>
												<span className="hc-menu-icon">{child.icon}</span>
												<span>{child.label}</span>
											</button>
										);
									})}
								</div>
							) : null}
						</div>
					);
				})}
			</nav>

			<div className="hc-sidebar-footer">
				<button type="button" className="hc-logout-btn" onClick={handleLogoutClick}>
					<span className="hc-menu-icon">
						<MdLogout size={18} />
					</span>
					<span>Logout</span>
				</button>
			</div>
		</div>
	);
}
