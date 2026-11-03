import json
from django.http import JsonResponse
from django.forms.models import model_to_dict
from .models import Anime


def _error(message, status=400):
    return JsonResponse({'error': message}, status=status)


def _parse_body(request):
    try:
        data = json.loads(request.body or '{}')
    except (TypeError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _anime_data(data, partial=False, require_apodo=False):
    allowed = {'apodo', 'titulo', 'imagen_url', 'episodios', 'ano', 'genero', 'descripcion', 'visto'}
    values = {key: data[key] for key in allowed if key in data}

    if 'apodo' in values:
        apodo = str(values['apodo']).strip()
        if not apodo:
            raise ValueError('El nombre del anime es obligatorio.')
        values['apodo'] = apodo
    elif require_apodo or not partial:
        raise ValueError('El nombre del anime es obligatorio.')

    for field in ('episodios', 'ano'):
        if field in values and values[field] not in (None, ''):
            try:
                values[field] = int(values[field])
            except (TypeError, ValueError):
                raise ValueError(f'El campo {field} debe ser un número.')
            if values[field] < 0:
                raise ValueError(f'El campo {field} no puede ser negativo.')
        elif field in values:
            values[field] = None

    if 'visto' in values and not isinstance(values['visto'], bool):
        raise ValueError('El campo visto debe ser booleano.')

    return values


def _update_anime_instance(anime, data, method):
    values = _anime_data(data, partial=(method == 'PATCH'))
    if method == 'PUT':
        values = _anime_data(data, partial=False, require_apodo=True)

    for field, value in values.items():
        setattr(anime, field, value)
    anime.save()
    return anime


def api_animes(request):
    if request.method == 'GET':
        animes = list(Anime.objects.order_by('-fecha_creacion').values())
        return JsonResponse(animes, safe=False)

    if request.method == 'POST':
        data = _parse_body(request)
        if data is None:
            return _error('El cuerpo debe ser un objeto JSON válido.')
        try:
            values = _anime_data(data, partial=False, require_apodo=True)
        except ValueError as error:
            return _error(str(error))
        anime = Anime.objects.create(**values)
        return JsonResponse({'mensaje': 'Anime guardado con éxito', 'id': anime.id}, status=201)

    if request.method in ('PATCH', 'PUT'):
        data = _parse_body(request)
        if data is None:
            return _error('El cuerpo debe ser un objeto JSON válido.')
        anime_id = data.pop('id', None)
        if not anime_id:
            return _error('Falta el identificador del anime.')
        try:
            anime = Anime.objects.get(pk=anime_id)
        except Anime.DoesNotExist:
            return _error('Anime no encontrado.', 404)
        try:
            anime = _update_anime_instance(anime, data, request.method)
        except ValueError as error:
            return _error(str(error))
        return JsonResponse({'mensaje': 'Anime actualizado correctamente', 'id': anime.id})

    if request.method == 'DELETE':
        data = _parse_body(request)
        anime_id = data.get('id') if data else request.GET.get('id')
        if not anime_id:
            return _error('Falta el identificador del anime.')
        try:
            anime = Anime.objects.get(pk=anime_id)
        except Anime.DoesNotExist:
            return _error('Anime no encontrado.', 404)
        anime.delete()
        return JsonResponse({'mensaje': 'Anime eliminado correctamente'})

    return _error('Método no permitido.', 405)


def api_anime_detail(request, anime_id):
    try:
        anime = Anime.objects.get(pk=anime_id)
    except Anime.DoesNotExist:
        return _error('Anime no encontrado.', 404)

    if request.method == 'GET':
        return JsonResponse(model_to_dict(anime), safe=False)

    if request.method in ('PATCH', 'PUT'):
        data = _parse_body(request)
        if data is None:
            return _error('El cuerpo debe ser un objeto JSON válido.')
        try:
            anime = _update_anime_instance(anime, data, request.method)
        except ValueError as error:
            return _error(str(error))
        return JsonResponse({'mensaje': 'Anime actualizado correctamente', 'id': anime.id})

    if request.method == 'DELETE':
        anime.delete()
        return JsonResponse({'mensaje': 'Anime eliminado correctamente'})

    return _error('Método no permitido.', 405)