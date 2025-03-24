# Location_cost_finder

The project will allows you to upload place image, find coordniate of the place and help you find distance that place.

# good commit rules

    “feat: allow user to invite over email”
    “chore: doubles cpu for api”
    “fix: clickable area for checkbox”
    “refactor: listen only to delete events”
    “doc: adds instructions to setup dev env”

# validate azure connection string from terminal

    az webapp config appsettings list \
    --resource-group locationcostfinder_group \
    --name locationcostfinder


# validate github connection string from terminal
    gh secret set DATABASE_URL \
    --body "postgres://xmehcriuev:location%4009@locationcostfinder-server.postgres.database.azure.com:5432/locationcostfinder-database?sslmode=require" \
    --repo shivam-9999/Location_cost_finder




    