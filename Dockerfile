# Build context for this Dockerfile must be `frontendApplications/` (the
# parent of this directory), not `system-frontend-21/` itself — this app
# depends on the sibling `frontend-libs-21` packages via
# `file:../frontend-libs-21/dist/platform` and `file:../frontend-libs-21/dist/shared`
# in package.json, which only resolves if that sibling directory is inside
# the build context too. Build from `frontendApplications/`:
#
#   docker build -f system-frontend-21/Dockerfile -t nexacore-system-frontend .

# Stage 1 - Build the frontend-libs-21 packages
FROM node:20 AS libs
WORKDIR /workspace/frontend-libs-21
COPY frontend-libs-21/package*.json ./
RUN npm install
COPY frontend-libs-21/. .
# platform must build first — shared's package.json declares @nexacore/platform
# as a peerDependency (for IconComponent), resolved via frontend-libs-21's own
# self-referential file: dep once dist/platform exists; a second `npm install`
# refreshes that symlink before shared's build needs it.
RUN npx ng build platform
RUN npm install
RUN npx ng build shared

# Stage 2 - Build the Angular app against the built packages
FROM node:20 AS build
WORKDIR /workspace/system-frontend-21
COPY system-frontend-21/package*.json ./
COPY --from=libs /workspace/frontend-libs-21/dist ../frontend-libs-21/dist
RUN npm install
COPY system-frontend-21/. .
RUN npm run build

# Stage 3 - Serve with nginx
FROM nginx:stable-alpine
COPY --from=build /workspace/system-frontend-21/dist/nexacore-system-frontend/browser /usr/share/nginx/html
COPY system-frontend-21/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
