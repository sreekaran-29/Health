class RedisConfig:
    try:
        get_all_clients = "AHS-GETALLCLIENTS#"
        get_all_clients_names = "AHS-GETALLCLIENTS_NAMES#"
        get_all_audit_logs = "AHS-GETALLAUDITLOGS#"
        get_all_subscriptions = "AHS-GETALLSUBSCRIPTIONS#"
        get_all_subscribers = "AHS-GETALLSUBSCRIBERS#"
        get_all_plan_prices = "AHS-GETALLPLANPRICES#"
        get_all_roles = "AHS-GETALLROLES#"
        get_all_users = "AHS-GETALLUSERS#"
        get_all_doctors = "AHS-GETALLDOCTORS#"
        get_roles_names = "AHS-GETROLESNAMES#"
        get_all_Services = "AHS-GETALLSERVICES#"
    except Exception as e:
        print(f"Error loading Redis configuration: {e}")
