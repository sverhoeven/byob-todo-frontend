# Bring Your Own Backend

*A pattern for sustainable research software collaboration*

As a research software engineer (RSE) working at the Netherlands eScience Center, I work on a projects together with domain scientists at univerisities and research institutes. 

For example currently I am working on the [Urban-M4 project](https://research-software-directory.org/projects/urban-m4) where we are trying to improve a weather model by telling it the properties of buildings in a city. As part of this project, I built a web-based application called [streetscapes-explorer](https://github.com/Urban-M4/Urban-M5) to create, review and edit segmented street view images. My engineering colleagues and project partners worked on the machine learning models and data processing pipelines that powered the backend of the web application.

But as the project neared its end, a familiar worry crept in: *what happens after I leave?*

## The Sustainability Problem

The project partners are domain scientists first and foremost. They focus on their research, not on maintaining web applications.
Maintaining a backend server written in Python, is something they have the time and expertise for.

The traditional approach would have been to build a monolithic application where frontend and backend are tightly coupled, deployed together, and maintained as one unit. But that would mean my partners would need to understand the frontend and keep the server running, up to date and secure. A recipe for software rot and eventual abandonment.

I needed a different approach. One where the frontend could essentially "freeze" after I left, while my partners could continue evolving their backend independently.

## The Solution: Bring Your Own Backend

The key insight was simple: **decouple where the frontend is hosted from where the backend runs**.

Instead of deploying the frontend and backend together on some server that my partners would need to maintain, I separated them completely:

- **Frontend**: As a single page web application using [React framework](https://react.dev/). Hosted as static files on [GitHub Pages](https://pages.github.com/) — zero maintenance, free hosting, always available
- **Backend**: Runs on my partners' own machines, under their full control

The magic that connects them? A URL query parameter.

```mermaid
graph TB
    subgraph "GitHub Pages (Maintained by RSE)"
        FE[Single page webapplication<br/>Static Files]
    end
    
    subgraph "Partner's Machine"
        BE[Python Backend<br/>FastAPI]
        DATA[(Local Data<br/>Images, DuckdDB)]
    end
    
    USER[Partner/User] -->|"1. Runs backend locally"| BE
    USER -->|"2. Visits frontend with<br/>?backend=http://localhost:5000"| FE
    FE <-->|"3. API calls over HTTP"| BE
    BE <--> DATA
    
    style FE fill:#e1f5fe
    style BE fill:#fff3e0
```

## The Magic: URL-Based Backend Configuration

Here's the core pattern. The frontend reads the backend URL from the query string:

```tsx
export function App() {
  const backend = new URLSearchParams(location.search).get('backend');
  if (!backend) {
    return <BackendForm />;
  }
  return <StreetscapesExplorer backend={backend} />;
}
```

When someone visits the frontend without specifying a backend, they see a helpful form with instructions:

![Streetscapes Explorer Backend Form](streetscapes-explorer-home.png)


When the frontend is unable to connect to the specified backend, it shows an error message with troubleshooting tips:

[![Streetscapes Explorer Backend Error](streetscapes-explorer-backend-error.png)](streetscapes-explorer-backend-error.png)

The workflow becomes beautifully simple:

1. Partner starts their backend locally
2. Partner visits the frontend URL with `?backend=http://localhost:5000`
3. The frontend connects to their local backend
4. All data stays on their machine

No rebuilds. No redeployments. No complex configuration. Just a URL parameter.

## Keeping It Simple for Partners

For this pattern to work after I leave, the backend needs to be dead simple to run. 

For the backend I used [FastAPI](https://fastapi.tiangolo.com/) because it makes building APIs in Python straightforward and enjoyable.

```python
from dataclasses import dataclass, field
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
```

Web browsers do not like the frontend and backend to being at different URLs.
For this in the backend we need to enable [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) like so:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
)
```

Then anyone can simply write a decorated and annotated Python function to define an API endpoint:

```python
@dataclass
class FilterParams(Bbox):
    ratings: list[int] = Field(default=[])

@dataclass
class Image:
    id: str
    url: str
    lat: float
    lon: float

@app.get("/images")
async def fetch_images(filter: Annotated[FilterParams, Query()]) -> list[Image]
    # ... implementation
```


And to make it even more user-friendly, the backend prints a clickable link to the frontend on startup:

```python
def main() -> None:
    url = "https://urban-m4.github.io/Urban-M5/?backend=http://localhost:8000"
    print(f"Waiting for the streetscapes-explorer to start...")
    print(f"Goto {url}")
    print("(Press CTRL+C to quit)")
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    main()
```

If you're feeling more helpful you can use [webbrowser.open(url)](https://docs.python.org/3/library/webbrowser.html#webbrowser.open) to open the URL automatically in the user's default browser.

## The Contract: OpenAPI as the Bridge

The frontend and backend need to agree on an API contract. Rather than maintaining documentation that inevitably drifts from reality, I used [OpenAPI](https://www.openapis.org/) as the single source of truth.

FastAPI automatically generates an OpenAPI specification from the Python code. I then use [OpenAPI TypeScript](https://openapi-ts.dev/introduction) to generate TypeScript types:

```bash
openapi-typescript http://localhost:5000/openapi.json -o ./src/lib/streetscapes-api.ts"
```


The frontend then make type-safe API calls:

```tsx
import createClient from 'openapi-fetch';
import type { paths } from './lib/streetscapes-api';

function StreetscapesExplorer({backend}: { backend: string }) {
  const client = createClient<paths>({ baseUrl: backend }); 
  const { data = [], error } = await client.GET('/images', {
    params: { query: { rating: [4, 5] } }
  });
  return (
    <div>
      {error && <div>Error: {error.message}</div>}
      {data.map(image => (
        <img key={image.id} src={image.url} alt={`Image ${image.id}`} />
      ))}
      {/* ... rest of the app like map view */}
    </div>
  );
};
```

This gives us compile-time safety: if my partners change the API contract, the TypeScript compiler will catch any mismatches when regenerating the types.

```mermaid
sequenceDiagram
    participant Users terminal
    participant Users web browser
    participant Backend as Local Backend
    participant Frontend as GitHub Pages
    
    Users terminal->>Backend: streetscapes-explorer
    Note over Backend: Starts on localhost:8000
    Backend-->> Users web browser: Prints frontend URL
    
    Users web browser->>Frontend: Opens URL with ?backend=localhost:8000
    Frontend->>Backend: GET /images
    Backend-->>Frontend: JSON response
    Frontend-->> Users web browser: Renders images
```

## Try it out yourself

I made a minimal example of this pattern with a simple TODO application.

Go to [https://sverhoeven.github.io/byob-todo-frontend/](https://sverhoeven.github.io/byob-todo-frontend/) and follow the instructions to run the backend locally.

The source code is available at [byob-todo-frontend](https://github.com/sverhoeven/byob-todo-frontend) and [byob-todo-backend](https://github.com/sverhoeven/byob-todo-backend)


## When to use Bring your own backend (BYOB)

This pattern isn't for every project, but it shines when:

- **Different expertise levels**: Frontend specialists work with domain experts who prefer other languages
- **Data sensitivity**: Partners need to keep data on their own machines
- **Limited resources**: No budget for ongoing server maintenance
- **Collaborative research**: Multiple groups might want to run their own backends

The "Bring Your Own Backend" pattern turned what could have been abandoned software into a sustainable tool that my partners can use and evolve long after our collaboration ended. Sometimes the best code you write is the code others don't have to maintain.
