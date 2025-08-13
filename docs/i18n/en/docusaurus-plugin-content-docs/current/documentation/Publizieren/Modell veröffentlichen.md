# Publishing a Model

Your model and its results are worth showing off!  Make your model accessible to other members of the Urban Model Builder community.

## Settings
In the **Version Settings** section of the sidebar, you’ll find the **Publish** function with the following options:

| Field | Description |
| ----- | ----------- |
| **Version Type** | Helps ensure traceability, transparency, reproducibility, and control when working with complex models |
| Minor (displayed as v0.1.0) | Only minor changes were made that do not fundamentally alter the model’s structure or logic — e.g., new or optimized parameter values, equation adjustments, additional descriptions, or name changes |
| Major (displayed as v1.0.0) | Significant changes were made that substantially alter the structure, logic, or assumptions of the model — e.g., adding new sections, changing the modeling approach or objectives |
| Publish to the API | The [Urban Model Platform](https://citysciencelab.github.io/urban-model-platform/content/index.html) serves as an interface to various microservices, including the Urban Model Builder, allowing data to be provided in a standardized format for use on other platforms |
| Notes | Only visible in the model’s metadata. Required for publication (minimum of 3 characters) |

---

## Publishing as a Model Server Endpoint
You can share your model not only through the graphical interface, but also in machine-readable form via the **OGC API Processes** interface.  
Publishing your model as a Model Server endpoint allows, for example, a municipal Urban Model Platform (UMP) or other applications to connect directly to it.  

For more information on the UMP, see [here](https://citysciencelab.github.io/urban-model-platform/content/03-architecture/overview.html).  

Models are reviewed and approved by an Urban Model Builder administrator. To request a review, send an email to **cut@hcu-hamburg.de**. After a short time and a successful review, you’ll receive a confirmation email stating that your model is now available via the OGC API Processes.  

If you delete your published model, it will be removed from all servers and your approval request will automatically expire. Deleting the published model not only withdraws it from publication — it will also disappear from your list of models, meaning you cannot continue editing it. If you want to withdraw publication but keep working on your model, create a clone or a new draft.  

By publishing your model, you agree to release it under the **GPL-3.0 license**. More details are available in the [Terms of Use](https://modelbuilder.comodeling.city/nutzungsbedingungen).

---

## Open Source
Our vision is to promote transparency, broad participation, and easy access to simulation models.  
This allows for better exploration of diverse scenarios and collaborative co-modelling of systems — supporting more robust decision-making!  

Modeling complex systems is no longer the sole domain of specialized software engineers.  
With the rise of open-source tools and web-based platforms, the field has become increasingly accessible — and it has clearly reached you!  
Directly in your browser, without any installation, you can try the completely free Urban Model Builder.  

The tool is based on the open-source simulation library [simulation](https://github.com/scottfr/simulation).  
For details on the software architecture and instructions for recreating it, visit [https://github.com/citysciencelab/urban-model-builder](https://github.com/citysciencelab/urban-model-builder).
